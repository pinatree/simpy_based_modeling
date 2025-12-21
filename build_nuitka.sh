rm -rf ./cbuilds/*;
python -m nuitka --standalone ./src/main.py --output-dir=./cbuilds;