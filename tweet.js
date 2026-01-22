import http from 'http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';
import express from 'express';


const date = new Date();
console.log(date.getTime()+5400*1000)


//store refresh token in environment variable.
const CLIENT_ID = process.env.OAUTH2CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH2CLIENT_SECRET;
const expire = process.env.EXPIRE_IN;
let refreshToken = process.env.REFRESH_TOKEN;

let access_token;

//check if access token is already generated and not expired.
const baseURL = "https://api.x.com/2/";
const accessToken = "oauth2/token";

function basicAuth(){
	const credentials = CLIENT_ID + ":" + CLIENT_SECRET;
	const buffer = Buffer.from(credentials, 'utf-8');
	const base64String = buffer.toString('base64');
	return base64String;
}

async function getAccessToken(){
	try{
		const response = await fetch(baseURL + accessToken, {
			method: "POST",
			headers: {
				'Content-Type': "application/x-www-form-urlencoded",
				Authorization: `Basic ${basicAuth()}`
			},
			body: new URLSearchParams({
				refresh_token: refreshToken,
				grant_type: 'refresh_token'
			})
		});
		if(!response.ok){
			const text = await response.text();
			console.error(text);
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		console.log(data);
		access_token = data.access_token;
		refreshToken = data.refresh_token;
		console.log(access_token);
		//postTweet(tweet,access_token);
	} catch(error){
		console.error("Fetch operation falied: ", error);
	  }
	  
}

getAccessToken();

	//if not expired, use the same access token
	
	//if expired, generate new access token using refresh token




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