#!/bin/bash

while true; do
    if $(flask run --with-threads); then
        echo "Restarting";
    else
        exit 0;
    fi
done
