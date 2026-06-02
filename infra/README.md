# Infra project

This project contains infrastructure code for getting the local database up and running within a docker container.

## Commands

To start the database container, run the following command:

```bash
nx run infra:db-start
```

To stop the database container, run the following command:

```bash
nx run infra:db-stop
```

To reset the database (stop, and remove volumes), run the following command (be careful, this will delete all data in the database):

```bash
nx run infra:db-reset
```

To view the logs of the database container, run the following command:

```bash
nx run infra:db-logs
```
