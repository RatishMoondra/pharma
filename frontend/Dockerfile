# frontend/Dockerfile

FROM node:20 AS build

WORKDIR /usr/src/app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

RUN npm run build

# ---------------- NGINX STAGE ----------------
FROM nginx:stable

COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# This now works because context = project root
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
