FROM node:latest as build-stage
ARG environment

WORKDIR /app

COPY package*.json /app/

RUN npm install --quiet

COPY ./ /app/

RUN npm run build -- --output-path=./dist/out --configuration=$environment --build-optimizer

FROM nginx:latest

COPY --from=build-stage /app/dist/out/ /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
