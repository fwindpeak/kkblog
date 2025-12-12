#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: $0 <command>"
  echo "Commands:"
  echo "  b    Build the project"
  echo "  c    Deploy to production"
  echo "  r    Restart Nginx"
  echo "example: $0 -bcr #build、deploy、restart nginx"
  exit 1
fi  

APP_NAME=$SERVER_NAME

source .env

HOST=$SERVER_HOME
PORT=$SERVER_PORT
SERVER_PATH=$SERVER_PATH

function build() {
  echo "**** build ****"
  npm run build
}

function deployProduction() {

  APP_NAME=$SERVER_NAME
  echo **** deployProduction ****
  scp -P $PORT -r dist/* $HOST:$SERVER_PATH/$APP_NAME/
  ssh $HOST -p $PORT "chown -R www:www $SERVER_PATH/$APP_NAME"
}

function restart_nginx() {
  echo "**** restart ngin: $HOST ****"
  ssh $HOST -p $PORT "nginx -s reload"
}

while getopts "bcr" opt; do
  case $opt in
  b)
    build
    ;;
  c)
    deployProduction
    ;;
  r)
    restart_nginx
    ;;
  \?)
    echo "Invalid option: -$OPTARG" >&2
    ;;
  esac
done
