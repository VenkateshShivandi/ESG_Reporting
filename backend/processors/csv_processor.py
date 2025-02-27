import pandas as pd
from datetime import datetime

def process_csv(file_path):
    # Read the CSV file
    df = pd.read_csv(file_path)
    
    # Get basic info
    rows, columns = df.shape
    column_names = df.columns.tolist()
    
    # Create a sample of the data (first 5 rows)
    sample_data = df.head(5).to_dict(orient='records')
    
    return {
        'type': 'csv',
        'rows': rows,
        'columns': columns,
        'column_names': column_names,
        'sample_data': sample_data,
        'processed_at': datetime.now().isoformat()
    } 