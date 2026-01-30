from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "google/roberta2roberta_L-24_gigaword"

# Download the tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# Save to the models directory
tokenizer.save_pretrained("./models")
model.save_pretrained("./models")

print("Model and tokenizer downloaded successfully!")