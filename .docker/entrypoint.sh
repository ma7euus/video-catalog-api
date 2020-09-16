#!/bin/bash

cd /home/node/app

npm install

## environments
if [ ! -f ".env" ]; then
  cp .env.example .env
fi

## run server
npx nodemon -L