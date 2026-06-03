# retailers

> integrating Pet Factory S1 with various retailers

## About

This project uses [Feathers](http://feathersjs.com). An open source framework for building APIs and real-time applications.

## Getting Started

1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
2. Install your dependencies

    ```
    cd path/to/retailers
    npm install
    ```

3. Start your app

    ```
    npm run migrate # Run migrations to set up the database
    npm start
    ```

## Testing

Run `npm test` and all your tests in the `test/` directory will be run.

## Scaffolding

This app comes with a powerful command line interface for Feathers. Here are a few things it can do:

```
$ npx feathers help                           # Show all commands
$ npx feathers generate service               # Generate a new Service
```

## Help

For more information on all the things you can do with Feathers visit [docs.feathersjs.com](http://docs.feathersjs.com).

heroku:
```````
heroku login
git push heroku main
git remote -v
heroku ps
heroku ps: scale web=1
heroku ps:exec --app=retailers
heroku run bash --app retailers
heroku update
heroku open

## Hub SSO

When opened from Pet Factory Hub, Retailers accepts a short-lived `hub_sso`
token, verifies it with `HUB_SSO_SECRET`, then creates its own
`retailers_session` httpOnly cookie through the Feathers `authentication`
service. Direct access without `hub_sso` continues to show the normal Retailers
login form, which creates the same cookie-backed session.

Set the same `HUB_SSO_SECRET` value in Hub, PNL, and Retailers.
Set `FEATHERS_SECRET` in Retailers for the local JWT cookie session.
