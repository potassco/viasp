import json
import pathlib

MESSAGES_PATH = pathlib.Path(
    __file__).parent.resolve() / "messages.json"

def load_messages(json_path):
    with open(json_path, 'r') as file:
        messages = json.load(file)
    return messages


# Load messages from the JSON file
MESSAGES = load_messages(MESSAGES_PATH)


def _(message_key):
    return MESSAGES.get(message_key, f"Message key '{message_key}' not found.")
