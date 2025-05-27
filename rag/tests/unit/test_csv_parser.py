from unittest.mock import patch, mock_open, MagicMock
from rag.parsers.csv_parser import (
    detect_encoding,
    detect_delimiter,
    extract_data_with_pandas,
)


def test_detect_encoding():
    # Mock the open function to simulate file reading
    with patch("builtins.open", mock_open(read_data=b"some data")) as mock_file:
        with patch("chardet.detect", return_value={"encoding": "utf-8"}):
            encoding = detect_encoding("mock/path/to/file.csv")
            assert encoding == "utf-8"
            mock_file.assert_called_once_with("mock/path/to/file.csv", "rb")


def test_detect_delimiter():
    # Mock the open function to simulate file reading
    mock_data = "col1,col2,col3\nval1,val2,val3\n"
    with patch("builtins.open", mock_open(read_data=mock_data)) as mock_file:
        delimiter = detect_delimiter("mock/path/to/file.csv", "utf-8")
        assert delimiter == ","
        mock_file.assert_called_once_with(
            "mock/path/to/file.csv", "r", encoding="utf-8", errors="replace"
        )


def test_extract_data_with_pandas():
    # Mock pandas.read_csv to simulate DataFrame creation
    with patch("pandas.read_csv") as mock_read_csv:
        mock_df = MagicMock()
        mock_df.columns.tolist.return_value = ["col1", "col2", "col3"]
        mock_df.values.tolist.return_value = [["val1", "val2", "val3"]]
        mock_df.shape = (1, 3)
        mock_df.dtypes.items.return_value = [
            ("col1", "object"),
            ("col2", "object"),
            ("col3", "object"),
        ]
        # Configure the mock to return the expected data
        mock_df.astype.return_value.where.return_value.values.tolist.return_value = [
            ["val1", "val2", "val3"]
        ]
        mock_read_csv.return_value = mock_df

        result = extract_data_with_pandas("mock/path/to/file.csv", "utf-8", ",")
        assert result["columns"] == ["col1", "col2", "col3"]
        assert result["data"] == [["val1", "val2", "val3"]]
        assert result["shape"] == (1, 3)
