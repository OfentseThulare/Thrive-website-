# First owner bootstrap

The CMS starts with no application users. A database operator must create the single first owner invitation before normal invitation management can begin.

## Requirements

* Install the PostgreSQL `psql` client.
* Obtain the direct Supabase Postgres connection URL from the protected deployment environment.
* Never place the database URL in a browser variable, Vercel public variable, source file or shell history.

## Run once

Set `SUPABASE_DB_URL` in the operator environment, then run:

```sh
npm run cms:bootstrap-owner -- owner@example.org 168
```

The optional final value is the invitation lifetime in hours, from 1 to 720. The default is 168 hours.

The script validates its input, passes connection fields to `psql` without printing the URL or password, and invokes the Postgres only bootstrap function. The function takes an advisory transaction lock and refuses to run if an owner, owner invitation or bootstrap record already exists. The database permanently records the request.

The invited owner then opens `/admin/login` and requests a secure sign in link using the same email address. Auth account creation consumes the invitation, creates the owner profile and role, and records bootstrap completion. Every later invitation is created through the authenticated owner interface and cannot grant the owner role.

If the one-time invitation expires before use, stop and investigate the deployment state. Do not delete bootstrap records or create owners through the application.
