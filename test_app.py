with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Let's check where renderGrid is being called.
# It should be called on initial load, inside route()
