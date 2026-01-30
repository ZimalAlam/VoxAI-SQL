from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import torch
import re
import sqlparse  

app = Flask(__name__)
CORS(app)  

MODEL_PATH = "./model"

# Define relationships manually for each DB
RELATIONSHIPS = {
    "RetailDB": {
        ("Customers", "Orders"): "Customers.customer_id = Orders.customer_id",
        ("Orders", "OrderItems"): "Orders.order_id = OrderItems.order_id",
        ("OrderItems", "Products"): "OrderItems.product_id = Products.product_id",
        ("Orders", "Payments"): "Orders.order_id = Payments.order_id"
    },
    "HospitalDB": {
        ("Patients", "Appointments"): "Patients.patient_id = Appointments.patient_id",
        ("Doctors", "Appointments"): "Doctors.doctor_id = Appointments.doctor_id",
        ("Appointments", "Treatments"): "Appointments.appointment_id = Treatments.appointment_id",
        ("Appointments", "Billing"): "Appointments.appointment_id = Billing.appointment_id"
    }
}

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
    print("✅ Model and tokenizer loaded successfully.")
except Exception as e:
    print(f"❌ Error loading model/tokenizer: {e}")
    tokenizer, model = None, None

@app.route('/nl-to-sql', methods=['POST'])
def nl_to_sql():
    if tokenizer is None or model is None:
        return jsonify({"error": "Model and tokenizer failed to load. Check logs."}), 500

    data = request.json
    question = data.get('question', '')  
    schema = data.get('schema', '')
    db_name = data.get('db_name', '')  # Optional database name for relationship-based processing

    if not question:
        return jsonify({"error": "Please provide the 'question' field."}), 400

    if not schema:
        schema = 'users(name, email, created_at, is_active), orders(id, user_id, order_date, total_amount), products(id, name, price, stock)'

    prompt = (
    f"You are an expert SQL assistant. Generate a correct and simple SQL query strictly based on the user's question and schema provided. "
    f"Always handle negative conditions explicitly mentioned in the question (e.g., users who have NOT placed orders). "
    f"Do NOT add extra columns or conditions unless explicitly requested. "
    f"Question: {question}\nSchema: {schema}\nSQL Query:")


    try:
        # Handle metadata queries first
        metadata_query = handle_metadata_queries(question, schema)
        if metadata_query:
            return jsonify({"sql_query": metadata_query})

        inputs = tokenizer.encode(prompt, return_tensors="pt", max_length=1024, truncation=True)
        outputs = model.generate(inputs, max_length=150, num_beams=4, early_stopping=True)

        sql_query = tokenizer.decode(outputs[0], skip_special_tokens=True)
        fixed_sql_query = fix_sql_query(sql_query, question, schema, db_name)

        if "Error:" in fixed_sql_query:
            return jsonify({"error": fixed_sql_query}), 400

        return jsonify({"sql_query": fixed_sql_query})
    except Exception as e:
        return jsonify({"error": f"Failed to generate SQL query: {str(e)}"}), 500


def handle_metadata_queries(question, schema):
    """Handle metadata queries about database structure."""
    question_lower = question.lower()
    
    # Check for table listing queries
    if any(phrase in question_lower for phrase in [
        "names of all tables", "list all tables", "show tables", 
        "what tables", "all table names", "tables in the db"
    ]):
        schema_tables = parse_schema(schema)
        table_names = list(schema_tables.keys())
        # Return a query that will show table names as results
        table_list = "', '".join(table_names)
        return f"SELECT '{table_list}' AS table_names;"
    
    # Check for column listing queries
    if any(phrase in question_lower for phrase in [
        "columns in", "describe table", "show columns", "table structure"
    ]):
        # Extract table name from question
        schema_tables = parse_schema(schema)
        for table_name in schema_tables.keys():
            if table_name.lower() in question_lower:
                columns = list(schema_tables[table_name])
                column_list = "', '".join(columns)
                return f"SELECT '{column_list}' AS columns_in_{table_name};"
    
    return None

def fix_group_by_qualifiers(query, schema_tables):
    """Fix GROUP BY clauses to use fully qualified column names when there are JOINs."""
    
    # Only fix if there are JOINs in the query
    if not re.search(r'\bJOIN\b', query, re.IGNORECASE):
        return query
    
    # Find GROUP BY clause
    group_by_match = re.search(r'\bGROUP BY\s+(.+?)(?:\s+HAVING|\s+ORDER BY|\s+LIMIT|$)', query, re.IGNORECASE)
    if not group_by_match:
        return query
    
    group_by_clause = group_by_match.group(1).strip()
    columns = [col.strip() for col in group_by_clause.split(',')]
    
    # Get tables used in the query
    tables_used = set(re.findall(r'\bFROM\s+(\w+)|\bJOIN\s+(\w+)', query, re.IGNORECASE))
    tables_used = {table for match in tables_used for table in match if table}
    
    fixed_columns = []
    for column in columns:
        # Skip if already qualified
        if '.' in column:
            fixed_columns.append(column)
            continue
        
        # Find which table contains this column
        containing_tables = []
        for table in tables_used:
            if table in schema_tables and column in schema_tables[table]:
                containing_tables.append(table)
        
        # If column exists in multiple tables, qualify it
        if len(containing_tables) > 1:
            # Use the first table that contains it (could be improved with better logic)
            qualified_column = f"{containing_tables[0]}.{column}"
            fixed_columns.append(qualified_column)
        elif len(containing_tables) == 1:
            # Qualify it for consistency
            qualified_column = f"{containing_tables[0]}.{column}"
            fixed_columns.append(qualified_column)
        else:
            # Column not found, keep as is
            fixed_columns.append(column)
    
    # Replace the GROUP BY clause
    new_group_by = ', '.join(fixed_columns)
    query = re.sub(r'\bGROUP BY\s+.+?(?=\s+HAVING|\s+ORDER BY|\s+LIMIT|$)', f'GROUP BY {new_group_by}', query, flags=re.IGNORECASE)
    
    return query

def fix_sql_query(query, question, schema, db_name=""):
    query = query.strip()

    # Remove model-generated table aliases
    query = re.sub(r'(\bFROM\b|\bJOIN\b)\s+(\w+)\s+AS\s+T\d+', r'\1 \2', query, flags=re.IGNORECASE)
    query = re.sub(r'\bT\d+\.', '', query)

    # Fix date/time patterns
    query = re.sub(r"(\w+)\s+LIKE\s+\"(\d{1,2}:\d{1,2})\"", r"\1 BETWEEN '00:00' AND '23:59'", query, flags=re.IGNORECASE)
    query = re.sub(r"(\w+)\s+LIKE\s+'(\d{4}-\d{2}-\d{2})'", r"\1 = '\2'", query, flags=re.IGNORECASE)

    schema_tables = parse_schema(schema)
    query = fix_missing_from_table(query, schema)
    query = fix_missing_join_table(query, schema)
    query = correct_table_references(query, schema)

    # Apply existing post-processing
    query = fix_invalid_having_clause(query, schema_tables)
    query = remove_unwanted_conditions(query, question)
    query = fix_list_all_queries(query, question, schema_tables)
    query = apply_limit_if_requested(query, question)

    # Add new post-processing functions
    query = auto_join_all_tables(query, question, schema)
    
    # Apply relationship-based post-processing 
    if not db_name:
        db_name = detect_database_type(schema)
    
    if db_name and db_name in RELATIONSHIPS:
        query = postprocess_sql(query, db_name)

    # Fix table name case sensitivity
    query = fix_table_name_case(query, schema)
    
    # Fix common value casing issues (gender, etc.)
    query = fix_value_casing(query)
    
    # Fix quote normalization (double quotes to single quotes)
    query = normalize_quotes(query)
    
    # Fix GROUP BY clauses to use fully qualified column names
    query = fix_group_by_qualifiers(query, schema_tables)
    
    # Fix ambiguous columns LAST to ensure no other function interferes
    query = fix_ambiguous_columns(query, schema_tables)

    # Try to auto-correct column issues before validation
    query = auto_correct_column_issues(query, schema_tables, question)
    
    # Validate column existence in SELECT and JOIN clauses
    column_error = validate_column_existence(query, schema_tables)
    if column_error:
        return f"Error: {column_error} → Query: {query}"
    
    # Validate JOIN conditions
    join_error = validate_join_conditions(query, schema_tables)
    if join_error:
        return f"Error: {join_error} → Query: {query}"

    # Validate structure
    validation_error = validate_sql_structure(query, schema)
    if validation_error:
        return f"Error: {validation_error} → Query: {query}"
    
    query = handle_negative_conditions(query, question, schema_tables)

    return query

def remove_unwanted_conditions(sql_query, question):
    # Only remove WHERE conditions if the question is very generic and doesn't contain filtering keywords
    # Look for filtering keywords that indicate WHERE conditions should be kept
    filtering_keywords = [
        "created", "date", "time", "active", "status", "amount", "price", "stock",
        "paid", "pending", "unpaid", "completed", "cancelled", "approved", "rejected",
        "marked as", "equal to", "greater than", "less than", "contains", "like",
        "where", "with", "having", "that are", "which are", "is", "are",
        "female", "male", "gender", "age", "older", "younger", "specialty", "city",
        "diagnosis", "medication", "treatment", "doctor", "patient", "appointment"
    ]
    
    # Check for filtering patterns that indicate WHERE conditions should be kept
    filtering_patterns = [
        r"\bfrom\s+\w+",  # "from Karachi", "from London"
        r"\bin\s+\w+",    # "in Karachi", "in London"  
        r"\bof\s+\w+",    # "of type X", "of category Y"
        r"\bwith\s+\w+",  # "with status X"
        r"\bthat\s+\w+",  # "that are X"
        r"\bwhich\s+\w+", # "which have X"
        r"=\s*['\"]?\w+['\"]?",  # "= 'value'" or "= value"
        r"\b\w+\s+(is|are)\s+\w+",  # "status is active"
    ]
    
    # If question contains any filtering keywords, keep WHERE conditions
    if re.search(r"(" + "|".join(filtering_keywords) + ")", question, re.IGNORECASE):
        return sql_query
    
    # If question contains filtering patterns, keep WHERE conditions
    for pattern in filtering_patterns:
        if re.search(pattern, question, re.IGNORECASE):
            return sql_query
    
    # Only remove WHERE conditions for very generic queries
    if not re.search(r"(created|date|time|active|status|amount|price|stock)", question, re.IGNORECASE):
        sql_query = re.sub(r'\bWHERE\b.*?(GROUP BY|ORDER BY|LIMIT|$)', r'\1', sql_query, flags=re.IGNORECASE).strip()
        sql_query = re.sub(r'\bHAVING\b.*?(GROUP BY|ORDER BY|LIMIT|$)', r'\1', sql_query, flags=re.IGNORECASE).strip()
    return sql_query


def fix_list_all_queries(query, question, schema_tables):
    """Fix queries where user asks to 'list all' but model only selects specific columns."""
    
    # Check if question asks to "list all", "show all", "find all" something
    if not re.search(r"(list all|show all|get all|fetch all|retrieve all|find all|all .+? that|all .+? which|all .+? from)", question, re.IGNORECASE):
        return query
    
    # Check if query has a WHERE clause (indicating filtering)
    if not re.search(r'\bWHERE\b', query, re.IGNORECASE):
        return query
    
    # Check if SELECT clause is not already SELECT *
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE | re.DOTALL)
    if not select_match or select_match.group(1).strip() == '*':
        return query
    
    selected_columns = select_match.group(1).strip()
    
    # If only selecting one column, check if we should change to SELECT *
    if ',' not in selected_columns:
        column = selected_columns.strip()
        # Remove table prefix if present
        if '.' in column:
            column = column.split('.')[-1]
        
        # For "find all", "list all" queries, usually want all information, not just ID
        should_select_all = False
        
        # Check if it's a status/condition column that's being filtered in WHERE
        status_columns = ['status', 'payment_status', 'order_status', 'active', 'is_active', 'state']
        if any(status_col in column.lower() for status_col in status_columns):
            should_select_all = True
        
        # Check if selecting only ID column for "find all" type queries
        elif column.lower().endswith('_id') or column.lower() == 'id':
            # For "find all X" queries, user usually wants all X information, not just ID
            should_select_all = True
        
        if should_select_all:
            # Also fix common column name mistakes
            where_clause = re.search(r'\bWHERE\b.*', query, re.IGNORECASE)
            if where_clause:
                where_text = where_clause.group(0)
                # Fix payment_method -> payment_status
                if 'payment_method' in where_text and 'payment_status' not in where_text:
                    query = query.replace('payment_method', 'payment_status')
            
            # Change SELECT column to SELECT *
            query = re.sub(r'SELECT\s+.*?\s+FROM', 'SELECT * FROM', query, flags=re.IGNORECASE | re.DOTALL)
    
    return query


def fix_invalid_having_clause(query, schema_tables):
    match = re.search(r'GROUP BY (.*?) HAVING (.*)', query, re.IGNORECASE)
    if match:
        group_by_cols = {col.strip() for col in match.group(1).split(',')}
        having_conditions = match.group(2)

       
        having_cols = re.findall(r'(\w+)\s*(?:=|<>|!=|>|<|LIKE)', having_conditions)

        for col in having_cols:
            if col not in group_by_cols:
              
                condition_pattern = rf'\bHAVING\b.*?({col}\s*(?:=|<>|!=|>|<|LIKE)\s*[^ ]+)'
                condition_match = re.search(condition_pattern, query, re.IGNORECASE)
                if condition_match:
                    condition = condition_match.group(1)

                  
                    query = re.sub(rf'(HAVING .*?)\bAND\b {condition}', r'\1', query, flags=re.IGNORECASE)
                    query = re.sub(rf'\bHAVING\b {condition}', '', query, flags=re.IGNORECASE)

                   
                    if 'WHERE' in query.upper():
                        query = re.sub(r'(WHERE.*?)(GROUP BY)', rf'\1 AND {condition} \2', query, flags=re.IGNORECASE)
                    else:
                        query = re.sub(r'(FROM .*?)(GROUP BY)', rf'\1 WHERE {condition} \2', query, flags=re.IGNORECASE)

        query = re.sub(r'\s+', ' ', query).strip()
    return query


def parse_schema(schema):
    """
    Extracts table-column mappings from schema.
    """
    schema_tables = {}
    table_definitions = re.findall(r'(\w+)\s*\(\s*([^)]*)\s*\)', schema)

    if not table_definitions:
        raise ValueError("Schema parsing error: No valid tables found in schema.")

    for table_name, columns in table_definitions:
        schema_tables[table_name.strip()] = set(map(str.strip, columns.split(",")))

    return schema_tables


def fix_missing_from_table(query, schema):
    schema_tables = parse_schema(schema)
    valid_tables = list(schema_tables.keys())

    if re.search(r'FROM\s+WHERE', query, re.IGNORECASE) or re.search(r'FROM\s*$', query, re.IGNORECASE):
        first_valid_table = valid_tables[0] if valid_tables else "orders"
        query = re.sub(r'FROM\s+WHERE', f'FROM {first_valid_table} WHERE', query, flags=re.IGNORECASE)
        query = re.sub(r'FROM\s*$', f'FROM {first_valid_table}', query, flags=re.IGNORECASE)

    return query


def fix_missing_join_table(query, schema):
    schema_tables = parse_schema(schema)
    valid_tables = set(schema_tables.keys())

    if re.search(r'FROM\s+JOIN', query, re.IGNORECASE):
        first_valid_table = list(valid_tables)[0] if valid_tables else "users"
        query = re.sub(r'FROM\s+JOIN', f'FROM {first_valid_table} JOIN', query, flags=re.IGNORECASE)

    return query

def fix_ambiguous_join_conditions(query, tables_used, schema_tables):
    """Fix ambiguous JOIN conditions by adding table prefixes."""
    # Find JOIN conditions with ambiguous column references
    join_pattern = r'JOIN\s+(\w+)\s+ON\s+(\w+)\s*=\s*(\w+)'
    matches = re.findall(join_pattern, query, re.IGNORECASE)
    
    for join_table, left_col, right_col in matches:
        # Check if columns are ambiguous (exist in multiple tables)
        left_tables = []
        right_tables = []
        
        for table in tables_used:
            if table in schema_tables:
                if left_col in schema_tables[table]:
                    left_tables.append(table)
                if right_col in schema_tables[table]:
                    right_tables.append(table)
        
        # If columns are ambiguous OR if both column names are the same, add table prefixes
        if len(left_tables) > 1 or len(right_tables) > 1 or left_col == right_col:
            # Find the main table (FROM table)
            from_match = re.search(r'FROM\s+(\w+)', query, re.IGNORECASE)
            main_table = from_match.group(1) if from_match else None
            
            # For same column names (like patient_id = patient_id), use main table and join table
            if left_col == right_col:
                left_prefix = main_table if main_table else (left_tables[0] if left_tables else 'table1')
                right_prefix = join_table
            else:
                # Determine correct table prefixes for different column names
                if main_table and main_table in left_tables:
                    left_prefix = main_table
                else:
                    left_prefix = left_tables[0] if left_tables else main_table
                    
                if join_table in right_tables:
                    right_prefix = join_table
                else:
                    right_prefix = right_tables[0] if right_tables else join_table
            
            # Replace the ambiguous JOIN condition
            old_condition = f'{left_col} = {right_col}'
            new_condition = f'{left_prefix}.{left_col} = {right_prefix}.{right_col}'
            
            # Use more specific replacement to avoid replacing other parts of the query
            old_join_clause = f'ON {old_condition}'
            new_join_clause = f'ON {new_condition}'
            query = query.replace(old_join_clause, new_join_clause)
    
    return query

def fix_ambiguous_columns(query, schema_tables):
    tables_used = set(re.findall(r'\bFROM\s+(\w+)|\bJOIN\s+(\w+)', query, re.IGNORECASE))
    tables_used = {table for match in tables_used for table in match if table}

    # Fix ambiguous JOIN conditions first
    query = fix_ambiguous_join_conditions(query, tables_used, schema_tables)

    # Fix ambiguous SELECT columns
    query = fix_ambiguous_select_columns(query, tables_used, schema_tables)

    return query

def fix_ambiguous_select_columns(query, tables_used, schema_tables):
    """Fix ambiguous columns in SELECT, GROUP BY, ORDER BY, and WHERE clauses by adding table prefixes."""
    
    def fix_column_in_clause(column, tables_used, schema_tables, query):
        """Helper function to fix a single column reference."""
        column = column.strip()
        
        # Skip if already has table prefix or is a function/expression
        if '.' in column or '(' in column or column.upper() in ['*', 'COUNT(*)', 'DISTINCT'] or column.isdigit():
            return column
        
        # Find which tables contain this column
        containing_tables = []
        for table in tables_used:
            if table in schema_tables and column in schema_tables[table]:
                containing_tables.append(table)
        
        # If column exists in multiple tables, add table prefix
        if len(containing_tables) > 1:
            # Use the first table (FROM table) as default
            from_match = re.search(r'FROM\s+(\w+)', query, re.IGNORECASE)
            main_table = from_match.group(1) if from_match else containing_tables[0]
            
            if main_table in containing_tables:
                return f"{main_table}.{column}"
            else:
                return f"{containing_tables[0]}.{column}"
        else:
            return column
    
    # Fix SELECT clause
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE | re.DOTALL)
    if select_match:
        select_clause = select_match.group(1).strip()
        columns = [col.strip() for col in select_clause.split(',')]
        fixed_columns = []
        
        for column in columns:
            fixed_columns.append(fix_column_in_clause(column, tables_used, schema_tables, query))
        
        new_select_clause = ', '.join(fixed_columns)
        query = re.sub(r'SELECT\s+(.*?)\s+FROM', f'SELECT {new_select_clause} FROM', query, flags=re.IGNORECASE | re.DOTALL)
    
    # Fix GROUP BY clause
    group_by_match = re.search(r'GROUP BY\s+(.*?)(?:\s+ORDER BY|\s+HAVING|\s+LIMIT|$)', query, re.IGNORECASE | re.DOTALL)
    if group_by_match:
        group_by_clause = group_by_match.group(1).strip()
        columns = [col.strip() for col in group_by_clause.split(',')]
        fixed_columns = []
        
        for column in columns:
            fixed_columns.append(fix_column_in_clause(column, tables_used, schema_tables, query))
        
        new_group_by_clause = ', '.join(fixed_columns)
        query = re.sub(r'GROUP BY\s+(.*?)(?=\s+ORDER BY|\s+HAVING|\s+LIMIT|$)', f'GROUP BY {new_group_by_clause}', query, flags=re.IGNORECASE | re.DOTALL)
    
    # Fix ORDER BY clause
    order_by_match = re.search(r'ORDER BY\s+(.*?)(?:\s+LIMIT|$)', query, re.IGNORECASE | re.DOTALL)
    if order_by_match:
        order_by_clause = order_by_match.group(1).strip()
        # Handle ORDER BY with ASC/DESC
        order_items = []
        for item in order_by_clause.split(','):
            item = item.strip()
            if ' ASC' in item.upper() or ' DESC' in item.upper():
                parts = item.split()
                column = parts[0]
                direction = ' '.join(parts[1:])
                fixed_column = fix_column_in_clause(column, tables_used, schema_tables, query)
                order_items.append(f"{fixed_column} {direction}")
            else:
                order_items.append(fix_column_in_clause(item, tables_used, schema_tables, query))
        
        new_order_by_clause = ', '.join(order_items)
        query = re.sub(r'ORDER BY\s+(.*?)(?=\s+LIMIT|$)', f'ORDER BY {new_order_by_clause}', query, flags=re.IGNORECASE | re.DOTALL)
    
    return query

def apply_limit_if_requested(sql_query, question):
    numeric_words = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
        'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
        'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40,
        'fifty': 50, 'hundred': 100
    }

    # Expanded list of generic keywords
    keywords = r'user|users|product|products|order|orders|transaction|transactions|message|messages|method|methods|item|items|record|records|entry|entries|result|results'

    limit_value = None

    match = re.search(r'\blimit\s+(\d+)\b', question, re.IGNORECASE)
    if match:
        limit_value = int(match.group(1))
    else:
        match_digits = re.search(r'\b(\d+)\s+(' + keywords + r')\b', question, re.IGNORECASE)
        if match_digits:
            limit_value = int(match_digits.group(1))
        else:
            match_words = re.search(r'\b(' + '|'.join(numeric_words.keys()) + r')\s+(' + keywords + r')\b', question, re.IGNORECASE)
            if match_words:
                limit_word = match_words.group(1).lower()
                limit_value = numeric_words.get(limit_word)

    if limit_value:
        sql_query = re.sub(r'LIMIT\s+\d+', '', sql_query, flags=re.IGNORECASE).strip()
        sql_query += f' LIMIT {limit_value}'
    else:
        sql_query = re.sub(r'LIMIT\s+\d+', '', sql_query, flags=re.IGNORECASE).strip()

    return sql_query.strip('; ') + ';'





def correct_table_references(query, schema):
    # This function is now simplified to avoid conflicts with fix_ambiguous_columns
    # The column reference fixing is handled by fix_ambiguous_columns which is more sophisticated
    return query

def handle_negative_conditions(sql_query, question, schema_tables):
    negative_conditions = [
        (r"users.*not.*placed.*orders", 
         "SELECT users.name FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE orders.id IS NULL"),

        (r"products.*not.*ordered", 
         "SELECT products.name FROM products LEFT JOIN orders ON products.id = orders.product_id WHERE orders.id IS NULL"),

        (r"transactions.*not.*completed", 
         "SELECT transactions.* FROM transactions WHERE transactions.payment_status != 'completed'")
    ]

    for pattern, replacement_query in negative_conditions:
        if re.search(pattern, question, re.IGNORECASE):
            return replacement_query + ';'

    return sql_query


def fix_table_name_case(query, schema):
    """Fix table name case to match schema exactly."""
    schema_tables = parse_schema(schema)
    schema_tables_lower = {k.lower(): k for k in schema_tables.keys()}
    
    # Find all table references in the query
    table_matches = re.findall(r'(FROM|JOIN)\s+(\w+)', query, re.IGNORECASE)
    
    for keyword, table_name in table_matches:
        if table_name.lower() in schema_tables_lower:
            correct_name = schema_tables_lower[table_name.lower()]
            if table_name != correct_name:
                # Replace the table name with correct case
                pattern = rf'\b{re.escape(table_name)}\b'
                query = re.sub(pattern, correct_name, query, flags=re.IGNORECASE)
    
    return query


def fix_value_casing(query):
    """Fix common value casing issues in WHERE clauses."""
    # Fix gender values
    query = re.sub(r"gender\s*=\s*'female'", "gender = 'Female'", query, flags=re.IGNORECASE)
    query = re.sub(r"gender\s*=\s*'male'", "gender = 'Male'", query, flags=re.IGNORECASE)
    
    # Fix payment status values
    query = re.sub(r"payment_status\s*=\s*'paid'", "payment_status = 'Paid'", query, flags=re.IGNORECASE)
    query = re.sub(r"payment_status\s*=\s*'pending'", "payment_status = 'Pending'", query, flags=re.IGNORECASE)
    query = re.sub(r"payment_status\s*=\s*'unpaid'", "payment_status = 'Unpaid'", query, flags=re.IGNORECASE)
    
    return query


def normalize_quotes(query):
    """Normalize double quotes to single quotes in WHERE clauses."""
    # Replace double quotes with single quotes in WHERE conditions
    query = re.sub(r'=\s*"([^"]*)"', r"= '\1'", query)
    query = re.sub(r'!=\s*"([^"]*)"', r"!= '\1'", query)
    query = re.sub(r'<>\s*"([^"]*)"', r"<> '\1'", query)
    query = re.sub(r'LIKE\s*"([^"]*)"', r"LIKE '\1'", query, flags=re.IGNORECASE)
    
    return query


def auto_correct_column_issues(query, schema_tables, question):
    """Auto-correct common column access issues by adding necessary JOINs."""
    
    # First, try to fix invalid JOIN conditions
    query = fix_invalid_join_conditions(query, schema_tables)
    
    # Fix cross-table column access issues
    query = fix_cross_table_column_access(query, schema_tables)
    
    # Extract SELECT columns and main table
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM\s+(\w+)', query, re.IGNORECASE | re.DOTALL)
    if not select_match:
        return query
    
    select_clause = select_match.group(1).strip()
    main_table = select_match.group(2).strip()
    
    # Skip if complex expressions
    if '*' in select_clause or '(' in select_clause:
        return query
    
    # Check if query already has JOINs - if so, don't add more
    if re.search(r'\bJOIN\b', query, re.IGNORECASE):
        return query
    
    columns = [col.strip() for col in select_clause.split(',')]
    missing_columns = []
    
    # Find columns that don't exist in the main table
    for column in columns:
        if '.' not in column and main_table in schema_tables and column not in schema_tables[main_table]:
            # Find which table has this column
            for table_name, table_columns in schema_tables.items():
                if column in table_columns:
                    missing_columns.append((column, table_name))
                    break
    
    if not missing_columns:
        return query
    
    # Try to auto-correct by adding JOINs for common patterns
    corrected_query = auto_add_joins_for_missing_columns(query, main_table, missing_columns, schema_tables, question)
    
    return corrected_query

def fix_invalid_join_conditions(query, schema_tables):
    """Fix invalid JOIN conditions by using correct relationship paths."""
    
    # Pattern for qualified JOIN conditions
    join_pattern = r'JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)'
    matches = re.findall(join_pattern, query, re.IGNORECASE)
    
    for join_table, left_table, left_col, right_table, right_col in matches:
        # Check if the JOIN condition is invalid
        left_valid = left_table in schema_tables and left_col in schema_tables[left_table]
        right_valid = right_table in schema_tables and right_col in schema_tables[right_table]
        
        if not left_valid or not right_valid:
            # Try to fix common patterns
            if left_table == 'Patients' and right_table == 'Billing' and left_col == 'patient_id' and right_col == 'patient_id':
                # Patients -> Billing should go through Appointments
                old_join = f'JOIN {join_table} ON {left_table}.{left_col} = {right_table}.{right_col}'
                new_join = f'JOIN Appointments ON {left_table}.patient_id = Appointments.patient_id JOIN {join_table} ON Appointments.appointment_id = {join_table}.appointment_id'
                query = query.replace(old_join, new_join)
            
            elif left_table == 'Doctors' and right_table == 'Billing' and left_col == 'doctor_id' and right_col == 'doctor_id':
                # Doctors -> Billing should go through Appointments
                old_join = f'JOIN {join_table} ON {left_table}.{left_col} = {right_table}.{right_col}'
                new_join = f'JOIN Appointments ON {left_table}.doctor_id = Appointments.doctor_id JOIN {join_table} ON Appointments.appointment_id = {join_table}.appointment_id'
                query = query.replace(old_join, new_join)
            
            elif left_table == 'Treatments' and right_table == 'Patients' and left_col == 'treatment_id' and right_col == 'treatment_id':
                # Treatments -> Patients should go through Appointments
                old_join = f'JOIN {join_table} ON {left_table}.{left_col} = {right_table}.{right_col}'
                new_join = f'JOIN Appointments ON {left_table}.appointment_id = Appointments.appointment_id JOIN {join_table} ON Appointments.patient_id = {join_table}.patient_id'
                query = query.replace(old_join, new_join)
            
            elif left_table == 'Treatments' and right_table == 'Doctors' and left_col == 'treatment_id' and right_col == 'treatment_id':
                # Treatments -> Doctors should go through Appointments
                old_join = f'JOIN {join_table} ON {left_table}.{left_col} = {right_table}.{right_col}'
                new_join = f'JOIN Appointments ON {left_table}.appointment_id = Appointments.appointment_id JOIN {join_table} ON Appointments.doctor_id = {join_table}.doctor_id'
                query = query.replace(old_join, new_join)
            
            elif left_table == 'Doctors' and right_table == 'Treatments' and left_col == 'doctor_id' and right_col == 'doctor_id':
                # Doctors -> Treatments should go through Appointments
                old_join = f'JOIN {join_table} ON {left_table}.{left_col} = {right_table}.{right_col}'
                new_join = f'JOIN Appointments ON {left_table}.doctor_id = Appointments.doctor_id JOIN {join_table} ON Appointments.appointment_id = {join_table}.appointment_id'
                query = query.replace(old_join, new_join)
    
    return query


def fix_cross_table_column_access(query, schema_tables):
    """Fix queries that try to access columns from wrong tables."""
    
    # Common cross-table access patterns that need fixing
    cross_table_fixes = [
        # Trying to get city from Orders instead of Customers
        {
            'pattern': r'SELECT\s+([^,]*,\s*)?city([^,]*,\s*)?\s+FROM\s+Orders',
            'fix': lambda m: f"SELECT {m.group(1) or ''}Customers.city{m.group(2) or ''} FROM Orders JOIN Customers ON Orders.customer_id = Customers.customer_id",
            'description': 'city from Orders -> JOIN with Customers'
        },
        # Trying to get customer info from Orders
        {
            'pattern': r'SELECT\s+([^,]*,\s*)?(first_name|last_name|email|phone)([^,]*,\s*)?\s+FROM\s+Orders',
            'fix': lambda m: f"SELECT {m.group(1) or ''}Customers.{m.group(2)}{m.group(3) or ''} FROM Orders JOIN Customers ON Orders.customer_id = Customers.customer_id",
            'description': 'customer info from Orders -> JOIN with Customers'
        },
        # Trying to get product info from Orders
        {
            'pattern': r'SELECT\s+([^,]*,\s*)?(name|category|price)([^,]*,\s*)?\s+FROM\s+Orders',
            'fix': lambda m: f"SELECT {m.group(1) or ''}Products.{m.group(2)}{m.group(3) or ''} FROM Orders JOIN OrderItems ON Orders.order_id = OrderItems.order_id JOIN Products ON OrderItems.product_id = Products.product_id",
            'description': 'product info from Orders -> JOIN with OrderItems and Products'
        },
        # Fix invalid direct JOIN between Customers and Products (most important fix)
        {
            'pattern': r'JOIN\s+Products\s+ON\s+Customers\.product_id\s*=\s*Products\.product_id',
            'fix': lambda m: 'JOIN Orders ON Customers.customer_id = Orders.customer_id JOIN OrderItems ON Orders.order_id = OrderItems.order_id JOIN Products ON OrderItems.product_id = Products.product_id',
            'description': 'Direct Customers->Products JOIN -> via Orders and OrderItems'
        },
        # Fix duplicate Orders JOIN (when there's already a JOIN with Orders)
        {
            'pattern': r'(JOIN\s+Orders\s+ON\s+[^J]+)(JOIN\s+Orders\s+ON\s+[^J]+)',
            'fix': lambda m: m.group(1),  # Keep only the first JOIN with Orders
            'description': 'Remove duplicate Orders JOIN'
        }
    ]
    
    # Apply fixes in order of priority
    for fix_rule in cross_table_fixes:
        if re.search(fix_rule['pattern'], query, re.IGNORECASE):
            query = re.sub(fix_rule['pattern'], fix_rule['fix'], query, flags=re.IGNORECASE)
            # Don't break here - we might need multiple fixes
    
    return query


def auto_add_joins_for_missing_columns(query, main_table, missing_columns, schema_tables, question):
    """Add JOINs to access columns from other tables."""
    
    # Common relationship patterns
    join_patterns = {
        # Patient-related queries
        ('Billing', 'patient_id'): [
            ('Appointments', 'appointment_id', 'appointment_id'),
            ('Patients', 'patient_id', 'patient_id')
        ],
        ('Treatments', 'patient_id'): [
            ('Appointments', 'appointment_id', 'appointment_id'),
            ('Patients', 'patient_id', 'patient_id')
        ],
        # Doctor-related queries
        ('Billing', 'doctor_id'): [
            ('Appointments', 'appointment_id', 'appointment_id'),
            ('Doctors', 'doctor_id', 'doctor_id')
        ],
        ('Treatments', 'doctor_id'): [
            ('Appointments', 'appointment_id', 'appointment_id'),
            ('Doctors', 'doctor_id', 'doctor_id')
        ],
        # Direct relationships
        ('Appointments', 'first_name'): [
            ('Patients', 'patient_id', 'patient_id')  # Assuming we want patient names
        ],
        ('Appointments', 'last_name'): [
            ('Patients', 'patient_id', 'patient_id')
        ]
    }
    
    # Check if we have a pattern for this case
    for column, target_table in missing_columns:
        pattern_key = (main_table, column)
        
        if pattern_key in join_patterns:
            join_chain = join_patterns[pattern_key]
            
            # Build the JOIN clauses
            current_query = query
            current_table = main_table
            
            for join_table, join_col1, join_col2 in join_chain:
                join_clause = f" JOIN {join_table} ON {current_table}.{join_col1} = {join_table}.{join_col2}"
                
                # Add the JOIN before any WHERE clause
                if 'WHERE' in current_query.upper():
                    current_query = re.sub(r'(\s+WHERE)', join_clause + r'\1', current_query, flags=re.IGNORECASE)
                else:
                    current_query += join_clause
                
                current_table = join_table
            
            # Update the SELECT clause to use the correct table prefix
            old_select = re.search(r'SELECT\s+(.*?)\s+FROM', current_query, re.IGNORECASE).group(1)
            new_select = old_select.replace(column, f"{target_table}.{column}")
            current_query = re.sub(r'SELECT\s+(.*?)\s+FROM', f'SELECT {new_select} FROM', current_query, flags=re.IGNORECASE)
            
            return current_query
    
    return query

def validate_join_conditions(query, schema_tables):
    """Validate that columns in JOIN conditions exist in their respective tables."""
    
    # Find all JOIN conditions
    join_pattern = r'JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)'
    matches = re.findall(join_pattern, query, re.IGNORECASE)
    
    for join_table, left_table, left_col, right_table, right_col in matches:
        # Validate left side of JOIN condition
        if left_table in schema_tables and left_col not in schema_tables[left_table]:
            return f"Column '{left_col}' does not exist in table '{left_table}' (JOIN condition)"
        
        # Validate right side of JOIN condition
        if right_table in schema_tables and right_col not in schema_tables[right_table]:
            return f"Column '{right_col}' does not exist in table '{right_table}' (JOIN condition)"
    
    # Also check for unqualified JOIN conditions (without table prefixes)
    unqualified_pattern = r'JOIN\s+(\w+)\s+ON\s+(\w+)\s*=\s*(\w+)'
    unqualified_matches = re.findall(unqualified_pattern, query, re.IGNORECASE)
    
    for join_table, left_col, right_col in unqualified_matches:
        # Get the main table (FROM table)
        from_match = re.search(r'FROM\s+(\w+)', query, re.IGNORECASE)
        main_table = from_match.group(1) if from_match else None
        
        if main_table:
            # Check if columns exist in their respective tables
            if main_table in schema_tables and left_col not in schema_tables[main_table]:
                return f"Column '{left_col}' does not exist in table '{main_table}' (JOIN condition)"
            
            if join_table in schema_tables and right_col not in schema_tables[join_table]:
                return f"Column '{right_col}' does not exist in table '{join_table}' (JOIN condition)"
    
    return None

def validate_sql_structure(query, schema):
    schema_tables = parse_schema(schema)
    table_matches = re.findall(r'FROM\s+(\w+)|JOIN\s+(\w+)', query, re.IGNORECASE)
    used_tables = {t for pair in table_matches for t in pair if t}

    # Create case-insensitive lookup for table names
    schema_tables_lower = {k.lower(): k for k in schema_tables.keys()}

    for table in used_tables:
        if table.lower() not in schema_tables_lower:
            # Check if it's actually a column name being used as table name
            is_column_name = False
            for table_name, columns in schema_tables.items():
                if table in columns:
                    is_column_name = True
                    return f"'{table}' is a column name, not a table name. Cannot use it in JOIN clause."
            
            if not is_column_name:
                return f"Table '{table}' does not exist."

    return None

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "NL-to-SQL API is running!"})

def extract_tables(query: str):
    """Extracts table names from the SQL query."""
    table_matches = re.findall(r'\bFROM\s+(\w+)|\bJOIN\s+(\w+)', query, re.IGNORECASE)
    return [t for pair in table_matches for t in pair if t]

def detect_database_type(schema):
    """Detect database type based on table names in schema."""
    schema_tables = parse_schema(schema)
    table_names = set(schema_tables.keys())
    
    # RetailDB indicators
    retail_indicators = {'Customers', 'Orders', 'OrderItems', 'Products', 'Payments'}
    
    # HospitalDB indicators  
    hospital_indicators = {'Patients', 'Appointments', 'Doctors', 'Treatments', 'Billing'}
    
    # Check overlap with known database types
    retail_overlap = len(table_names.intersection(retail_indicators))
    hospital_overlap = len(table_names.intersection(hospital_indicators))
    
    if retail_overlap >= 2:
        return "RetailDB"
    elif hospital_overlap >= 2:
        return "HospitalDB"
    
    return None

def add_missing_joins(query: str, db_name: str):
    """Add missing joins based on predefined relationships."""
    if db_name not in RELATIONSHIPS:
        return query
    
    query = sqlparse.format(query, reindent=True, keyword_case='upper')
    tables_found = extract_tables(query)
    used_tables = set(tables_found)

    joins_needed = []
    for (table1, table2), condition in RELATIONSHIPS[db_name].items():
        if table1 in used_tables and table2 in used_tables:
            if condition not in query:
                joins_needed.append((table1, table2, condition))

    # Append missing joins
    for t1, t2, cond in joins_needed:
        if f"JOIN {t2}" not in query and f"JOIN {t1}" not in query:
            join_clause = f" JOIN {t2} ON {cond}"
            query = re.sub(rf"\bFROM\s+{t1}\b", f"FROM {t1}{join_clause}", query, flags=re.IGNORECASE)
        elif f"JOIN {t1}" not in query:
            join_clause = f" JOIN {t1} ON {cond}"
            query = re.sub(rf"\bFROM\s+{t2}\b", f"FROM {t2}{join_clause}", query, flags=re.IGNORECASE)

    return sqlparse.format(query, reindent=True, keyword_case='upper')

def postprocess_sql(query: str, db_name: str):
    """Enhanced post-processing with relationship-based joins."""
    if db_name not in RELATIONSHIPS:
        return query
        
    query = query.strip().rstrip(";")
    
    # Ensure SELECT clause
    if not query.upper().startswith("SELECT"):
        query = "SELECT * " + query

    # Add joins if incomplete and user wants all tables
    if "JOIN" not in query and "all" in query.lower():
        # Get the main table (first table in relationships)
        main_table = list(RELATIONSHIPS[db_name].keys())[0][0]
        join_query = f"SELECT * FROM {main_table}"
        query = join_query

        for (table1, table2), condition in RELATIONSHIPS[db_name].items():
            if table2 != main_table:
                query += f" JOIN {table2} ON {condition}"

    query = add_missing_joins(query, db_name)
    return query

def auto_join_all_tables(sql_query, question, schema):
    """Automatically join all tables when requested by user."""
    if not re.search(r'\bjoin all tables\b|\binclude all tables\b|\bcombine all\b', question, re.IGNORECASE):
        return sql_query

    schema_tables = parse_schema(schema)
    join_clauses = []
    table_list = list(schema_tables.keys())
    used_tables = set()

    # Build inferred join relationships
    for table in table_list:
        cols = schema_tables[table]
        for col in cols:
            if col.endswith('_id'):
                ref_table = col[:-3] + 's'  # crude plural guess
                if ref_table in schema_tables:
                    join_condition = f"{table}.{col} = {ref_table}.{col}"
                    if join_condition not in [clause.split(' ON ')[1] for clause in join_clauses if ' ON ' in clause]:
                        join_clauses.append(f"JOIN {ref_table} ON {join_condition}")
                        used_tables.add(table)
                        used_tables.add(ref_table)

    # Start with the first table
    base_table = table_list[0]
    used_tables.add(base_table)

    # Reconstruct SELECT if needed
    if "SELECT *" in sql_query.upper() or not re.search(r'SELECT\s+(.*?)\s+FROM', sql_query, re.IGNORECASE):
        select_cols = []
        for t in used_tables:
            for c in schema_tables[t]:
                select_cols.append(f"{t}.{c}")
        select_clause = "SELECT " + ", ".join(select_cols)
        sql_query = re.sub(r'SELECT\s+\*\s+FROM', '', sql_query, flags=re.IGNORECASE)
        sql_query = select_clause + f" FROM {base_table} "

    # Build JOINs if not already present
    if not re.search(r'\bJOIN\b', sql_query, re.IGNORECASE):
        join_clause = ' '.join(join_clauses)
        sql_query += ' ' + join_clause

    return sql_query.strip('; ') + ';'

def validate_column_existence(query, schema_tables):
    """Validate that columns exist in the tables they're being selected from."""
    
    # Extract SELECT columns
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM\s+(\w+)', query, re.IGNORECASE | re.DOTALL)
    if not select_match:
        return None
    
    select_clause = select_match.group(1).strip()
    main_table = select_match.group(2).strip()
    
    # Skip if SELECT * or complex expressions
    if '*' in select_clause or '(' in select_clause:
        return None
    
    # Get columns from SELECT clause
    columns = [col.strip() for col in select_clause.split(',')]
    
    # Clean up columns to handle DISTINCT, functions, etc.
    cleaned_columns = []
    for col in columns:
        # Remove DISTINCT keyword
        col = re.sub(r'\bDISTINCT\s+', '', col, flags=re.IGNORECASE)
        # Remove common functions like COUNT, SUM, etc.
        col = re.sub(r'\b(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)', r'\2', col, flags=re.IGNORECASE)
        cleaned_columns.append(col.strip())
    
    columns = cleaned_columns
    
    # Check if query has JOINs
    has_joins = bool(re.search(r'\bJOIN\b', query, re.IGNORECASE))
    
    for column in columns:
        column = column.strip()
        
        # Skip if already has table prefix
        if '.' in column:
            continue
            
        # If no JOINs, check if column exists in main table
        if not has_joins:
            if main_table in schema_tables and column not in schema_tables[main_table]:
                # Try to suggest a better query by finding which table has this column
                suggestion = suggest_table_for_column(column, main_table, schema_tables)
                if suggestion:
                    return f"Column '{column}' does not exist in table '{main_table}'. {suggestion}"
                else:
                    return f"Column '{column}' does not exist in table '{main_table}'"
        else:
            # If has JOINs, check if column exists in any of the used tables
            table_matches = re.findall(r'FROM\s+(\w+)|JOIN\s+(\w+)', query, re.IGNORECASE)
            used_tables = {t for pair in table_matches for t in pair if t}
            
            column_found = False
            for table in used_tables:
                if table in schema_tables and column in schema_tables[table]:
                    column_found = True
                    break
            
            if not column_found:
                return f"Column '{column}' does not exist in any of the used tables: {', '.join(used_tables)}"
    
    return None


def suggest_table_for_column(column, current_table, schema_tables):
    """Suggest which table contains the column and how to access it."""
    tables_with_column = []
    
    for table_name, columns in schema_tables.items():
        if column in columns:
            tables_with_column.append(table_name)
    
    if not tables_with_column:
        return None
    
    if len(tables_with_column) == 1:
        target_table = tables_with_column[0]
        return f"Column '{column}' exists in table '{target_table}'. Consider using a JOIN to access it."
    else:
        table_list = "', '".join(tables_with_column)
        return f"Column '{column}' exists in tables: '{table_list}'. Consider using JOINs to access it."

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5003)
