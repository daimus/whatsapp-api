# WhatsApp API
An implementation of [@adiwajshing/Baileys](https://github.com/adiwajshing/Baileys) as a RESTful API service with multi device support. Build with ExpressJS with Service Layer and Pub/Sub Architecture

## Feature
1. Send message
2. Send scheduled message
3. Send bulk message
4. Rate limiter
5. Incoming/update message webhook

## Requirement
1. NodeJS ^14
2. MongoDB

## Installation
```
git clone https://github.com/daimus/whatsapp-api
cd whatsapp-api
yarn install
```
Start development mode
```
yarn dev
```
Build and start production mode
```
yarn build
yarn start
```

### `.env` Configuration
```
JWT_SECRET ='' # JWT secret key
JWT_ALGO='HS256' # Algoritm used in JWT

MONGODB_URI	= '' # MongoDB URI (because Agenda needs to schedule message)

INCOMING_MESSAGE_WEBHOOK_URL='' # URL to send incoming message report
UPDATE_MESSAGE_WEBHOOK_URL='' # URL to send update message reqport

DELAY_BULK_MESSAGE=5 # Delay sending bulk message in second
USERNAME = 'user' # Username
PASSWORD = 'password' # Password
RATE_LIMIT = 15 # Rate limit in secons
SESSION_DIRECTORY = 'auth_info_baileys'	# Path to save baileys auth info
DEFAULT_COUNTRY_CODE = 'ID' # Default country for formatting phone number
```

## API Documentation
### Starting Session
To start the session you need to run the app by running command ``yarn start`` (run the built) or ``yarn dev`` (run development mode). This command will run the app and continue previous session (if exist). If previous session doesn't exist You will receive QR Code to scan in the WhatsApp app.

Add `--new` arg into to delete previous session and start new session.
```
yarn start --new
or
yarn dev --new
```
### Authentication
Every endpoint is using Bearer Token as the authentication method. To get the token, make POST request to ``/api/auth/signin`` with username and password request body
```
POST /api/auth/signin

{
    "username": "user",
    "password": "password"
}
```
You will receive the token if the credentials is valid. Attach that token as Authorization Bearer header for every request.
### Verify WhatsApp Number
```
GET /api/contacts/PHONE_NUMBER/verify?countryCode=COUNTRY_CODE
```
### Sending Message
Sending message will create a new Agenda job. You can send the message to a receiver by passing receiver in data body. You can send to many receivers also by passing array of receiver as receivers in data body.
```
POST /api/messages

{
    "receiver": "PHONE_NUMBER_OR_JID",
    "message": {
        "text": "Hello world"
    }
}
```
whatsapp-api also support various message type like image, audio, video, button, template button, list, location, etc. Please visit full API Documentation for more example.
### Incoming Message Webhook
You can enable webhook for incoming whatsapp message by configure `INCOMING_MESSAGE_WEBHOOK_URL` in `.env`. This webhook will execute POST request, and then you will receive data body like this
```
{
  "sender" : string,
  "message" : string,
  "pushName" : string
}
```
### Update Message Webhook
You can enable webhook to receive update the message that you sent via this REST API by configure `UPDATE_MESSAGE_WEBHOOK_URL` in `.env`. This webhook will make PATCH request with body
```
{
  "_id" : ObjectId,
  "whatsappMessageId" : string,
  "jodId" : ObjectId,
  "receiver" : string,
  "jid" : string,
  "failReason" : string
  "status" : enum('ERROR','PENDING','SERVER_ACK',DELIVERY_ACK','READ','PLAYED'),
  "histories" : Array<{
    "status" : enum('ERROR','PENDING','SERVER_ACK',DELIVERY_ACK','READ','PLAYED'),
    "timestamp" : number
  }>
}
```

### Visit [https://documenter.getpostman.com/view/5302683/2s8YzQWjR5](https://documenter.getpostman.com/view/5302683/2s8YzQWjR5) for complete API Documentation

## Todo
1. Unit testing
2. Incoming/update message hook auth
3. Retry failing job
4. Report
5. Create docker image
