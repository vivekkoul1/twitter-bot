import http from 'http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';
import express from 'express';

//Step-1 of OAuth2.0 with PKCE workflow: Create an authorization URL
//Define Environment variables: import the app's CLIENT_ID from .env file:
const CLIENT_ID = process.env.OAUTH2CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH2CLIENT_SECRET;
var refresh_token
var access_token
var expire =  expire

const PORT = process.env.PORT || 8080;

//
const codeVerifier = crypto.randomBytes(64).toString('base64url');
const code_challenge = crypto.createHash('sha256').update(codeVerifier).digest().toString('base64')
					   .replace(/\+/g, '-')
					   .replace(/\//g, '_')
					   .replace(/=+$/, '');

const baseURL = "https://api.x.com/2/";
const authEndpointURL = "oauth2/authorize";
const accessTokenURL = "oauth2/token";
const tweetURL = "tweets";
const tweet = `Hello at ${new Date().toLocaleTimeString()}!!`

const authQueryPara = new URLSearchParams({
	response_type: "code",
	client_id: CLIENT_ID,
	redirect_uri: `https://twitter-refresh-token-generate.up.railway.app/callback`,
	scope: "tweet.write tweet.read users.read offline.access",
	// scope: "tweet.write offline.access",
	state: crypto.randomBytes(16).toString('hex'),
	code_challenge: code_challenge,
	code_challenge_method: "S256"
})
const authURL = "https://x.com/i/" + authEndpointURL + "?" + authQueryPara.toString();
console.log(`Open this URL in your browser and authorise:\n${authURL}`)


const app = express();


function basicAuth(){
	const credentials = CLIENT_ID + ":" + CLIENT_SECRET;
	const buffer = Buffer.from(credentials, 'utf-8');
	const base64String = buffer.toString('base64');
	return base64String;
}

async function postAccessToken(code){
	try{
		const response = await fetch(baseURL + accessTokenURL, {
			method: "POST",
			headers: {
				'Content-Type': "application/x-www-form-urlencoded",
				Authorization: `Basic ${basicAuth()}`
			},
			body: new URLSearchParams({
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: `https://twitter-refresh-token-generate.up.railway.app/callback`,
				code_verifier: codeVerifier
			})
		});
		if(!response.ok){
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		console.log(data);
		refresh_token = data.refresh_token;
		access_token = data.access_token;
		expire = data.expires_in;
		// console.log(access_token);
		//postTweet(tweet,access_token);
	} catch(error){
		console.error("Fetch operation falied: ", error);
	  }
	  
}

//TODO: Save the refresh token in a database generated from above.

app.get("/", (req, res) =>{
	res.send(`Server is running on \nhttps://twitter-refresh-token-generate.up.railway.app/`);
})

app.get("/callback", (req, res) =>{
	res.send(`The authorisation code is sent to your console.log`);
	const redirectAuthCode = req.query.code;
	const redirectState = req.query.state;
	if(redirectState == authQueryPara.get('state')) {
		//some funtion
		postAccessToken(redirectAuthCode)
	}
})


app.listen(PORT, ()=> {
	console.log("server is running....");
})












