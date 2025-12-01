In order to deploy the application to Google App Engine follow these steps:
1. Create a frontend build (npm run build).
2. Copy the files (of frontend build) into public folder in packages/api. Ignoring packages/api/public/ (frontend build) from git commit.
3. Now the frontend and backend uses the same domain. As we have incorporated the dist (from frontend) into packages/api/public
4. Now deploy the app using gcloud app deploy from packages/api