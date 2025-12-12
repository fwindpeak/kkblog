#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: $0 <command>"
  echo "Commands:"
  echo "  b    Build the project"
  echo "  c    Deploy to production"
  echo "example: $0 -bc #build、deploy"
  exit 1
fi  


source .env

HOST=$SERVER_HOME
PORT=$SERVER_PORT
SERVER_PATH=$SERVER_PATH

function build() {
  echo "**** build ****"
  npm run build
}

function deployProduction() {

  echo **** deployProduction ****
  scp -P $PORT -r dist/* $HOST:$SERVER_PATH
  ssh $HOST -p $PORT "chown -R www:www $SERVER_PATH"
}


while getopts "bcr" opt; do
  case $opt in
  b)
    build
    ;;
  c)
    deployProduction
    ;;
  \?)
    echo "Invalid option: -$OPTARG" >&2
    ;;
  esac
done
