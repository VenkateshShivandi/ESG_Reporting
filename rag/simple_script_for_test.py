def add_numbers(a: int, b: int) -> int:
    """
    A simple function that adds two numbers together.
    
    Args:
        a (int): First number
        b (int): Second number
        
    Returns:
        int: Sum of the two numbers
    """
    return a + b

if __name__ == "__main__":
    # Example usage
    num1 = 5
    num2 = 10
    result = add_numbers(num1, num2)
    print(f"The sum of {num1} and {num2} is: {result}")
