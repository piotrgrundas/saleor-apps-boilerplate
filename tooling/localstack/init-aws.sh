#!/bin/bash
set -euo pipefail

# https://docs.localstack.cloud/references/init-hooks/
#
# Bootstraps both AppConfig backends so either can be selected at runtime
# without restarting LocalStack:
#   - Secrets Manager: creates an empty JSON secret so first read succeeds.
#   - Parameter Store: creates a namespace marker at the root path. Tenant
#     params (`${APP_CONFIG_STORE_PATH}/<saleorDomain>`) are written lazily on
#     first config save.

SEPARATOR='----------------------------------------------------------------------------'
ENDPOINT_URL="http://localhost:4566"

echo -e "\n"
echo $SEPARATOR
echo -e "AppConfig store path: ${APP_CONFIG_STORE_PATH}\n"

echo -e "Creating Secrets Manager secret ${APP_CONFIG_STORE_PATH}.\n"
aws secretsmanager create-secret \
  --region "${AWS_REGION}" \
  --endpoint-url="${ENDPOINT_URL}" \
  --name "${APP_CONFIG_STORE_PATH}" \
  --secret-string '{}'
echo -e "\nCreated ${APP_CONFIG_STORE_PATH} in ${AWS_REGION}"

echo -e "\nCreated namespace marker. Tenant params (\`${APP_CONFIG_STORE_PATH}/<saleorDomain>\`) are written lazily on first config save."
