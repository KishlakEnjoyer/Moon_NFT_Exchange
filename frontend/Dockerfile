FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_IMAGES_URL
ARG REACT_APP_FRONT_URL

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV REACT_APP_IMAGES_URL=$REACT_APP_IMAGES_URL
ENV REACT_APP_FRONT_URL=$REACT_APP_FRONT_URL

RUN npx react-scripts build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
