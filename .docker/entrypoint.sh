#!/bin/bash

if [ ! -d ".docker/elasticdata" ]; then
 mkdir -p .docker/elasticdata
 chmod -R 777 .docker/elasticdata
fi

cd /home/node/app

npm install

## environments
if [ ! -f ".env" ]; then
  cp .env.example .env
fi

## run server
nodemon -L