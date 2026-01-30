import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faTable } from '@fortawesome/free-solid-svg-icons';

interface SQLResultCardProps {
  results: any[];
}

const SQLResultCard: React.FC<SQLResultCardProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-600 text-sm">No results found</p>
      </div>
    );
  }

  const columns = Object.keys(results[0]);

  return (
    <div className="mt-4 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5942E9] to-[#42DFE9] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faTable} className="text-white" />
            <span className="text-white font-medium">Query Results</span>
          </div>
          <span className="text-white text-sm">
            {results.length} {results.length === 1 ? 'row' : 'rows'}
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Table Header */}
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {columns.map((column) => {
                    const value = row[column];
                    return (
                      <td
                        key={`${rowIndex}-${column}`}
                        className="px-4 py-3 text-sm text-gray-900 font-mono whitespace-nowrap"
                      >
                        {value === null ? (
                          <span className="text-gray-400 italic">NULL</span>
                        ) : typeof value === 'object' ? (
                          JSON.stringify(value)
                        ) : typeof value === 'string' && value.includes('T') && !isNaN(Date.parse(value)) ? (
                          new Date(value).toLocaleString()
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Showing all results</span>
          <span>{results.length} {results.length === 1 ? 'row' : 'rows'} returned</span>
        </div>
      </div>
    </div>
  );
};

export default SQLResultCard; 