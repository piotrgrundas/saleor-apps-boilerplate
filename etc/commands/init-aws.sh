#!/bin/bash
set -euo pipefail

# https://docs.localstack.cloud/references/init-hooks/

SEPARATOR='----------------------------------------------------------------------------'
ENDPOINT_URL="http://localhost:4566"

echo -e "\n"

echo $SEPARATOR
echo -e "Running AWS create secret command for ${SECRET_MANAGER_APP_CONFIG_PATH}.\n"
aws secretsmanager create-secret --region ${AWS_REGION} --endpoint-url=${ENDPOINT_URL} --name ${SECRET_MANAGER_APP_CONFIG_PATH} --secret-string '{}'
echo -e "\nCreated ${SECRET_MANAGER_APP_CONFIG_PATH} in for ${AWS_REGION}"
