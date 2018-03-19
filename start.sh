#!/bin/sh
bundle exec sidekiq -c 5 -q default -q mailers -q pull -q push &
npm run start &
bundle exec puma -C config/puma.rb &
