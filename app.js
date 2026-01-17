import http from 'http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';
import express from 'express';

//Step-1 of OAuth2.0 with PKCE workflow: Create an authorization URL
//Define Environment variables: import the app's CLIENT_ID from .env file:
const CLIENT_ID = process.env.OAUTH2CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH2CLIENT_SECRET;


const PORT = process.env.PORT || 8080;

//
const codeVerifier = crypto.randomBytes(64).toString('base64url');
const code_challenge = crypto.createHash('sha256').update(codeVerifier).digest().toString('base64')
					   .replace(/\+/g, '-')
					   .replace(/\//g, '_')
					   .replace(/=+$/, '');

const baseURL = "https://api.x.com/2/";
const authEndpoint = "oauth2/authorize";
const accessToken = "oauth2/token";

const authQueryPara = new URLSearchParams({
	response_type: "code",
	client_id: CLIENT_ID,
	//redirect_uri: "https://vivekkoul1.github.io/CS50-final-project-dog-breed-selector/index.html",
	redirect_uri: `http://localhost:${PORT}/callback`,
	
	scope: "tweet.read tweet.write offline.access",
	state: crypto.randomBytes(16).toString('hex'),
	code_challenge: code_challenge,
	code_challenge_method: "S256"
})
const authURL = "https://x.com/i/" + authEndpoint + "?" + authQueryPara.toString();
// console.log(`Open this URL in your browser and authorise:\n${authURL}`)


const app = express();


const basicAuth = ()=>{
	const credentials = CLIENT_ID + ":" + CLIENT_SECRET;
	const buffer = Buffer.from(credentials, 'utf-8');
	const base64String = buffer.toString('base64');
	return base64String;
}

async function postAccessToken(url, code){
	try{
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Authorization": `Basic ${basicAuth()}`
			},
			body: new URLSearchParams({
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: "http://localhost:8000/callback",
				code_verifier: codeVerifier
			})
		});
		if(!response.ok){
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		console.log(data);
	} catch(error){
		console.error("Fetch operation falied: ", error);
	  }
}



app.get("/", (req, res) =>{
	res.send(`Server is running on http://localhost:${PORT}`);
})

app.get("/callback", (req, res) =>{
	res.send(`The authorisation code is sent to your console.log`);
	const redirectAuthCode = req.query.code;
	const redirectState = req.query.state;
	if(redirectState == authQueryPara.get('state')) {
		//some funtion
		postAccessToken(baseURL + accessToken, redirectAuthCode)
	}
})



app.listen(PORT, ()=> {
	console.log("server is running....");
})




////Step-2 of OAuth2.0 with PKCE workflow: Create an authorization URL








//Connect to an AI 

// import OpenAI from "openai";
// const OpenAI = require( "openai");
// const anyscale = new OpenAI({
  // baseURL: "https://api.endpoints.anyscale.com/v1",
  // apiKey: process.env.ANYSCALE_API_KEY,
// });

// async function chat_complete(prompt) {
  // const completion = await anyscale.chat.completions.create({
    // model: "meta-llama/Meta-Llama-3-8B-Instruct",
    // messages: [
      // { role: "system", content: "You are a helpful assistant." },
      // { role: "user", content: prompt },
    // ],
    // temperature: 0.7,
    // max_tokens: 50
  // });
  // console.log(completion.choices);
// }

// const query = "why sky is blue";
// chat_complete(query);00