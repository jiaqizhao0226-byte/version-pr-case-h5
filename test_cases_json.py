import json

with open('/tmp/version-pr-case-h5/data/cases.json', 'r') as f:
    try:
        cases = json.load(f)
        print("JSON is valid. Number of cases:", len(cases))
    except Exception as e:
        print("JSON Error:", e)
