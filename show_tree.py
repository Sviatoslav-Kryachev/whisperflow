import os

root = os.path.abspath(os.getcwd())

exclude_dirs = {".idea", "__pycache__", ".venv", ".pytest_cache"}
exclude_exts = {".pyc"}

def show_tree(path, prefix=""):
    items = [i for i in os.listdir(path)
             if (os.path.isdir(os.path.join(path, i)) and i not in exclude_dirs) or
                (os.path.isfile(os.path.join(path, i)) and os.path.splitext(i)[1] not in exclude_exts)]

    count = len(items)
    for idx, item in enumerate(items):
        is_last = idx == count - 1
        full_path = os.path.join(path, item)
        connector = "└──" if is_last else "├──"
        print(f"{prefix}{connector} {item}")
        if os.path.isdir(full_path):
            new_prefix = prefix + ("    " if is_last else "│   ")
            show_tree(full_path, new_prefix)

show_tree(root)
