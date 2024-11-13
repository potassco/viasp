"""
Exceptions
"""

class InvalidSyntax(Exception):
    """
    Exception returned when the input syntax is not expected
    """
    def __init__(self, *args):
        super().__init__("\n".join(str(arg) for arg in args))

class InvalidSyntaxJSON(InvalidSyntax):
    """
    Exception returned when the input syntax is not expected
    """

    def __init__(self, *args):
        super().__init__("\n".join(args))


class NoRelaxedModelsFoundException(Exception):
    """Exception raised when no relaxed models are found."""

    def __init__(self, message="No relaxed models were found."):
        self.message = message
        super().__init__(self.message)
