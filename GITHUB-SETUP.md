# Publish Morrow Objects To GitHub

## 1. Create the GitHub repository

On GitHub, create a new empty repository. Do not add a README, `.gitignore`, or license because this project already contains its own files.

## 2. Connect this local project

Replace the URL below with the HTTPS URL of the repository you created:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

For SSH instead:

```powershell
git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## 3. Authentication

GitHub no longer accepts account passwords for Git over HTTPS. Use GitHub Desktop, Git Credential Manager, or a GitHub personal access token when Git prompts for credentials.

## 4. Files intentionally excluded

- `node_modules/`: local installed dependencies
- `database/morrow.sqlite`: local database and user/order data
- `.env*`: secrets and environment-specific configuration

The database schema remains tracked in `database/schema.sql`, so another developer can recreate the database locally.

## 5. After publishing

Clone and run the project with:

```powershell
npm install
npm start
```

The local frontend runs on port `3000` and the API runs on port `3001`.