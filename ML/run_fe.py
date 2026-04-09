import traceback
try:
    import feature_engineering
    feature_engineering.main()
except Exception as e:
    with open("python_error.log", "w") as f:
        traceback.print_exc(file=f)
