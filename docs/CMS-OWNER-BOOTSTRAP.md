# First owner bootstrap

The CMS starts with no application users. A database operator must create the single first owner invitation before normal invitation management can begin.

## Requirements

* Install the PostgreSQL `psql` client.
* Obtain the direct Supabase Postgres connection URL from the protected deployment environment.
* Never place the database URL in a browser variable, Vercel public variable, source file or shell history.

## Run once

Set `SUPABASE_DB_URL` in the operator environment, then run:

```sh
npm run cms:bootstrap-owner -- create owner@example.org 168
```

The first argument is deliberately explicit. Use `create` only for the first invitation. The optional final value is the invitation lifetime in hours, from 1 to 720. The default is 168 hours.

The script validates its input, passes connection fields to `psql` without printing the URL or password, and invokes the Postgres only bootstrap function. The function takes an advisory transaction lock and refuses to run if an owner, owner invitation or bootstrap record already exists. The database permanently records the request.

The invited owner then opens `/admin/login` and requests a secure sign in link using the same email address. Auth account creation consumes the invitation, creates the owner profile and role, and records bootstrap completion. Every later invitation is created through the authenticated owner interface and cannot grant the owner role.

If the invitation expires before use, or the address was mistyped, inspect the invitation and owner records first. A Postgres operator may then rotate the unconsumed invitation:

```sh
npm run cms:bootstrap-owner -- rotate corrected-owner@example.org 168
```

Rotation keeps the old invitation as revoked history and updates the singleton bootstrap record to the replacement. The database refuses rotation after the invitation has been consumed, bootstrap completion has been recorded or any owner role exists. Never delete bootstrap records or create an owner through the application.
