from rag.simple_script_for_test import add_numbers

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
