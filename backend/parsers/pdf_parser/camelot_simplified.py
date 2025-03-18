import camelot
import os
from concurrent.futures import ThreadPoolExecutor
import time
import pandas as pd
import numpy as np
import fitz

pdf_path = "./test_files/test.pdf"

# Get the number of pages in the PDF
def get_num_pages(pdf_path):
    doc = fitz.open(pdf_path)
    page_count = doc.page_count
    doc.close()
    return page_count

num_pages = get_num_pages(pdf_path)

# Estimate time taken to extract all tables in the PDF
def estimate_time_taken(num_pages):
    return num_pages * 1.5

print(f"Estimated time taken to extract all tables in the PDF: {estimate_time_taken(num_pages)} seconds")

def extract_table_from_page(page_num):
    tables = camelot.read_pdf(pdf_path, pages=str(page_num))
    return tables

start_time = time.time()
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(extract_table_from_page, page) for page in range(1, num_pages + 1)]
    tables = [future.result() for future in futures]

end_time = time.time()
print(f"Time taken: {end_time - start_time} seconds")

# Count the total number of tables found
total_tables = sum(len(table_list) for table_list in tables)
print(f"In this time, we found {total_tables} tables in the PDF")

# Save the extracted tables to CSV files
table_count = 0
for page_idx, table_list in enumerate(tables):
    # Each item in 'tables' is a TableList for one page
    for table_idx, table in enumerate(table_list):
        table_count += 1
        # Now 'table' is an individual table object that has a 'df' attribute
        output_filename = f"table_page{page_idx+1}_{table_idx+1}.csv"
        table.df.to_csv(output_filename, index=False)
        print(f"Saved table {table_count} to {output_filename}")