# Transcribe a phone call in real-time

Do your customers or users use the telephone? What sort of discussions do you have on the phone?

Would their phone calls be more efficient if you could transcribe what is said on the call? What if you could analyze the transcription using natural language understanding? And what if you could do all of this in real-time, while the call is still on-going?

Analysis of unstructured data, such as the audio from phone calls, can bring many benefits: such as providing guidance to people on the phone to help make their call more effective, prioritising users who would benefit from additional support, or identifying other automated actions that can be taken in response to phone call discussions. Specific responses vary depending on use cases, but all such solutions have one thing in common: the need to transcribe and analyze transcriptions in real-time.

This code pattern shows developers how to stream phone call audio through [IBM Watson Speech to Text](https://cloud.ibm.com/catalog/services/speech-to-text) and [IBM Watson Natural Language Understanding](https://cloud.ibm.com/catalog/services/natural-language-understanding) services.

When you have completed this code pattern, you will understand how to:

* use IBM Watson Speech to Text to transcribe audio in real-time
* use IBM Watson Natural Language Understanding to perform analysis on transcriptions in real-time

![architecture](doc/source/images/architecture.png)

## Demo

[![video recording of the code pattern in action](./doc/source/images/video-demo-thumbnail.png)](https://youtu.be/So3b4uJGaBw)

[video recording of the code pattern in action : youtu.be/So3b4uJGaBw](https://youtu.be/So3b4uJGaBw)

## Flow

1. One person makes a phone call to a phone number managed by Twilio _[(more details)](./doc/FLOW-DETAILS.md#1---collecting-the-phone-number-to-connect-to)_
2. Twilio routes the phone call to the receiver, who answers the call _[(more details)](./doc/FLOW-DETAILS.md#2---connecting-the-call)_

The caller and receiver start talking to each other.
While they are doing this...

3. Twilio streams a copy of the audio from the phone call to your application _[(more details)](./doc/FLOW-DETAILS.md#3---forwarding-call-audio-to-the-application)_
4. Your application sends audio to the Speech to Text service for transcribing _[(more details)](./doc/FLOW-DETAILS.md#4---sending-call-audio-to-speech-to-text)_
5. Speech to Text asynchronously sends transcriptions to the app when they are available _[(more details)](./doc/FLOW-DETAILS.md#5---receiving-transcriptions-from-speech-to-text)_
6. The app submits the transcription text to Natural Language Understanding for analysis _[(more details)](./doc/FLOW-DETAILS.md#6---analyzing-transcriptions)_
7. The transcriptions and analyses can be monitored from a web page

---

## Steps

Set the following environment variables in your shell for use in the commands below
```sh
CODE_ENGINE_PROJECT_NAME=my-phone-stt-demo-project
CODE_ENGINE_APP_NAME=phone-stt-demo
IBM_CLOUD_REGION=eu-gb
```

1. [Log into IBM Cloud](#1-log-into-ibm-cloud)
2. [Create a project in IBM Code Engine](#2-create-ibm-code-engine-project)
3. [Create API keys for Watson services used in this project](#3-create-ibm-watson-credentials)
4. [Clone the source code](#4-clone-the-repo)
5. [Build the application image](#5-build-the-application-image)
6. [Push the application image to a container registry](#6-push-the-application-image-to-a-container-registry)
7. [Create a pull secret for the image](#7-create-a-pull-secret-for-the-application-image)
8. [Deploy the application](#8-deploy-the-application)
9. [Configure Twilio to use your application](#9-point-a-twilio-phone-number-at-your-deployed-application)
10. [Make a phone call](#10-try-it-out)


### 1. Log into IBM Cloud

Log in to the desired account with the IBM Cloud CLI using `ibmcloud login`

### 2. Create IBM Code Engine project

The quickest way to get up and running is to use the [IBM Cloud CLI with the Code Engine plugin](https://cloud.ibm.com/docs/codeengine?topic=codeengine-cli).

If you do not have a Code Engine project, create one
```sh
ibmcloud ce project create --name $CODE_ENGINE_PROJECT_NAME
```

If you already have a Code Engine project, target the project
```sh
ibmcloud ce project target --name $CODE_ENGINE_PROJECT_NAME
```

### 3. Create IBM Watson credentials

#### 3.1 Speech to Text

Create an instance of the IBM Watson Speech to Text service
```sh
ibmcloud resource service-instance-create \
    phone-stt-demo-speech-to-text \
    speech-to-text \
    lite \
    $IBM_CLOUD_REGION
```

_This creates a free instance of the service, which should be sufficient for trying this project. See the [catalog page](https://cloud.ibm.com/catalog/services/speech-to-text) for more details about the limitations._

Create an API key for your Speech to Text instance
```sh
ibmcloud resource service-key-create \
    code-engine-stt-credentials \
    Manager \
    --instance-name phone-stt-demo-speech-to-text
```

Extract the API key and instance URL into environment variables
```sh
STT_API_KEY=$(ibmcloud resource service-key code-engine-stt-credentials  --output json | jq -r ".[0].credentials.apikey")
STT_INSTANCE_URL=$(ibmcloud resource service-key code-engine-stt-credentials  --output json | jq -r ".[0].credentials.url")

echo "Speech to Text : API key : $STT_API_KEY"
echo "Speech to Text : URL     : $STT_INSTANCE_URL"
```

_This uses [jq](https://stedolan.github.io/jq/) to extract the API key and URL. If you don't want to use `jq`, you can simply run `ibmcloud resource service-key code-engine-stt-credentials  --output json` and create environment variables with the API key and URL from the credentials that are output._

Create a Secret with the API key and instance URL
```sh
ibmcloud ce secret create \
    --name phone-demo-apikey-stt \
    --from-literal STT_API_KEY=$STT_API_KEY \
    --from-literal STT_INSTANCE_URL=$STT_INSTANCE_URL
```

#### 3.2 Natural Language Understanding

Create an instance of the IBM Watson Natural Language Understanding service
```sh
ibmcloud resource service-instance-create \
    phone-stt-demo-natural-language-understanding \
    natural-language-understanding \
    free \
    $IBM_CLOUD_REGION
```

_This creates a free instance of the service, which should be sufficient for trying this project. See the [catalog page](https://cloud.ibm.com/catalog/services/natural-language-understanding) for more details about the limitations._

Create an API key for your Natural Language Understanding instance
```sh
ibmcloud resource service-key-create \
    code-engine-nlu-credentials \
    Manager \
    --instance-name phone-stt-demo-natural-language-understanding
```

Extract the API key and instance URL into environment variables
```sh
NLU_API_KEY=$(ibmcloud resource service-key code-engine-nlu-credentials  --output json | jq -r ".[0].credentials.apikey")
NLU_INSTANCE_URL=$(ibmcloud resource service-key code-engine-nlu-credentials  --output json | jq -r ".[0].credentials.url")

echo "Natural Language Understanding : API key : $NLU_API_KEY"
echo "Natural Language Understanding : URL     : $NLU_INSTANCE_URL"
```

_This uses [jq](https://stedolan.github.io/jq/) to extract the API key and URL. If you don't want to use `jq`, you can simply run `ibmcloud resource service-key code-engine-stt-credentials  --output json` and create environment variables with the API key and URL from the credentials that are output._

Create a Secret with the API key and instance URL
```sh
ibmcloud ce secret create \
    --name phone-demo-apikey-nlu  \
    --from-literal NLU_API_KEY=$NLU_API_KEY \
    --from-literal NLU_INSTANCE_URL=$NLU_INSTANCE_URL
```

### 4. Clone the repo

Clone the `phone-stt-demo` repo locally. In a terminal, run:

```sh
git clone https://github.com/IBM/phone-stt-demo
cd phone-stt-demo
```

### 5. Build the application image

```sh
docker build -t phone-stt-demo:latest .
```

### 6. Push the application image to a container registry

You can push the application image to any container registry that you like.

The instructions in this step explain how to use the IBM Cloud Container Registry, using the [IBM Cloud CLI with the Container Registry plugin](https://cloud.ibm.com/docs/Registry?topic=container-registry-cli-plugin-containerregcli).

Set the following environment variables in your shell for use in the commands below
```sh
CONTAINER_REGISTRY_REGION=uk.icr.io
```

Specify the region to use
```sh
ibmcloud cr region-set $CONTAINER_REGISTRY_REGION
```

Log into the container registry
```sh
ibmcloud cr login --client docker
```

Create a namespace to store your application image
```sh
ibmcloud cr namespace-add $CODE_ENGINE_PROJECT_NAME
```

Push the image
```sh
IMAGE_LOCATION=$CONTAINER_REGISTRY_REGION/$CODE_ENGINE_PROJECT_NAME/phone-stt-demo:latest
docker tag phone-stt-demo:latest $IMAGE_LOCATION
docker push $IMAGE_LOCATION
```

### 7. Create a pull secret for the application image

The way to do this depends on the container registry that you are using.

The instructions in this step assume that you are using the [IBM Cloud Container Registry](https://cloud.ibm.com/docs/Registry?topic=Registry-registry_overview).

Create an API key with permission to pull your images from the container registry.
```sh
ibmcloud iam service-id-create \
    phone-stt-demo-pull-secret \
    -d "Pull secret used by Code Engine for the phone-stt-demo Docker image"

ibmcloud iam service-policy-create \
    phone-stt-demo-pull-secret \
    --service-name container-registry \
    --roles Reader

ibmcloud iam service-api-key-create  \
    phone-stt-demo-pull-secret-key \
    phone-stt-demo-pull-secret \
    --description "API key for the phone-stt-demo-pull-secret service ID used by Code Engine"
```

_This will create an API key which will be displayed only once. You should make a copy of it as it cannot be retrieved after it has been created._

Set an environment variable with the API key
```sh
IMAGE_REGISTRY_APIKEY=<your-pull-secret-api-key>
```

Create a Secret with the image registry pull secret
```sh
ibmcloud ce registry \
    create \
    --name phone-stt-demo-registry \
    --server $CONTAINER_REGISTRY_REGION \
    --username iamapikey \
    --password $IMAGE_REGISTRY_APIKEY
```

### 8. Deploy the application

The location of your Docker image will depend on the container registry used in Step 6.

If you used the IBM Container Registry with the instructions above, the location will be: `$CONTAINER_REGISTRY_REGION/$CODE_ENGINE_PROJECT_NAME/phone-stt-demo:latest`

If you used a different image registry, replace the location in the command below with the location of your image.

```sh
ibmcloud ce application create \
    --name $CODE_ENGINE_APP_NAME \
    --image $IMAGE_LOCATION \
    --registry-secret phone-stt-demo-registry \
    --cpu 0.125 --memory 0.25G --ephemeral-storage 400M \
    --port 8080 \
    --maxscale 1 \
    --env-from-secret phone-demo-apikey-stt \
    --env-from-secret phone-demo-apikey-nlu
```


### 9. Point a Twilio phone number at your deployed application

Get the URL for your application

```sh
ibmcloud ce application get \
    --name $CODE_ENGINE_APP_NAME \
    --output url
```

This will give you a URL like `https://phone-stt-demo.abcdefg1a2b.eu-gb.codeengine.appdomain.cloud`.

Use this as the `REPLACE-THIS-URL` value in following the [Twilio setup instructions](./twilio-setup/instructions.md).


### 10. Try it out!

Open the URL from [step 9](#9-point-a-twilio-phone-number-at-your-deployed-application) in a web browser.

Make a phone call to the Twilio phone number.

When prompted, enter the phone number that you want to call, **including** the international dialling code for the country the phone number is in.

(For example, to call the UK phone number 02079463287, you should enter `442079463287` when prompted.)

---

## License

This code pattern is licensed under the Apache License, Version 2. Separate third-party code objects invoked within this code pattern are licensed by their respective providers pursuant to their own separate licenses. Contributions are subject to the [Developer Certificate of Origin, Version 1.1](https://developercertificate.org/) and the [Apache License, Version 2](https://www.apache.org/licenses/LICENSE-2.0.txt).

[Apache License FAQ](https://www.apache.org/foundation/license-faq.html#WhatDoesItMEAN)
