ESLINT_SRC_ERRORS=0
ESLINT_TEST_ERRORS=0

set +e

echo "Running eslint..."

./node_modules/.bin/eslint .

if [ $? -ne 0 ]; then
    ESLINT_SRC_ERRORS=1
fi

./node_modules/.bin/eslint test

if [ $? -ne 0 ]; then
    ESLINT_TEST_ERRORS=1
fi

if [ "$ESLINT_SRC_ERRORS" == "1" ] || [ "$ESLINT_TEST_ERRORS" == "1" ]; then
    echo "Found eslint errors"
    exit 1
fi

echo "No eslint errors"
