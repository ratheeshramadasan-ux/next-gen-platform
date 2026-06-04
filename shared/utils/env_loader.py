import os
from dotenv import load_dotenv

def load_project_env():
    """
    Finds the project root and loads the .env file.
    This ensures that all services use the same single source of truth.
    """
    # Start from this file's directory: .../next-gen-platform/shared/utils
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Go up twice to reach next-gen-platform root
    project_root = os.path.dirname(os.path.dirname(current_dir))
    env_path = os.path.join(project_root, ".env")
    
    if os.path.exists(env_path):
        load_dotenv(env_path)
        return True
    return False
