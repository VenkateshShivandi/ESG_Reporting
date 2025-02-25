from rag.simple_script_for_test import add_numbers
import pytest

def test_add_numbers():
    # Test case 1: Testing positive numbers
    assert add_numbers(5, 10) == 15
    
    # Test case 2: Testing with zero
    assert add_numbers(0, 5) == 5
    assert add_numbers(5, 0) == 5
    assert add_numbers(0, 0) == 0
    
    # Test case 3: Testing negative numbers
    assert add_numbers(-5, -3) == -8
    assert add_numbers(-5, 5) == 0
    
    # Test case 4: Testing larger numbers
    assert add_numbers(1000, 2000) == 3000
    
    # Test case 5: Testing floating point numbers
    assert add_numbers(1.5, 2.5) == 4.0
    assert round(add_numbers(0.1, 0.2), 1) == 0.3  # Handling floating point precision issues

def test_add_numbers_with_different_types():
    # Test adding an int and a float
    assert add_numbers(5, 5.5) == 10.5
    
    # Test error cases
    with pytest.raises(TypeError):
        add_numbers("5", 10)  # Strings cannot be directly added to numbers
