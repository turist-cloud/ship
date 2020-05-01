#!/usr/bin/env bash

cp -R .next/serverless/pages ./out
mkdir -p ./out/_next
cp -R ./.next/static ./out/_next || true
cp -R ./public/. out/ || true
