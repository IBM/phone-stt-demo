FROM registry.access.redhat.com/ubi8/nodejs-16-minimal

# setup dependencies first to make future builds quicker
COPY package*.json ./
RUN npm clean-install --only=production

# add source code
COPY app.js .
COPY lib      lib
COPY ui       ui

CMD ["npm", "start"]
