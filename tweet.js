import http from 'http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';
import express from 'express';
import OpenAI from "openai";
import * as fs from 'fs';


//store refresh token in environment variable.
const CLIENT_ID = process.env.OAUTH2CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH2CLIENT_SECRET;
let refreshToken = process.env.REFRESH_TOKEN;

//define initial values for access token and time at which access token expires.
let accessTokenExpiresAt = 0;
let accessToken = null;

//check if access token is already generated and not expired.
const baseURL = "https://api.x.com/2/";
const accessTokenURL = "oauth2/token";
const tweetURL = "tweets";

//read prompt file for AI.
let file;
try{
	file = fs.readFileSync("./prompt.txt");
} catch (err) {
	console.error(err);
}

//Oauth2 process starts.
function basicAuth(){
	const credentials = CLIENT_ID + ":" + CLIENT_SECRET;
	const buffer = Buffer.from(credentials, 'utf-8');
	const base64String = buffer.toString('base64');
	return base64String;
}


function isAccessTokenExpired() {
	const buffer = 60 * 1000; 				// refresh 1 min early
    return !accessToken || Date.now() >= (accessTokenExpiresAt - buffer);
}

async function refreshAccessToken() {
	try{
		const response = await fetch(baseURL + accessTokenURL, {
			method: "POST",
			headers: {
			  "Content-Type": "application/x-www-form-urlencoded",
			  "Authorization": `Basic ${basicAuth()}`
			},
			body: new URLSearchParams({
			  grant_type: "refresh_token",
			  refresh_token: refreshToken
			}).toString()
		});
		if(!response.ok){
			const text = await response.text();
			console.error(text);
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		// console.log(data.refresh_token);
		accessToken = data.access_token;
		refreshToken = data.refresh_token;          // 🔁 rotation
		accessTokenExpiresAt = Date.now() + data.expires_in * 1000;
	} catch(error){
		console.error("Fetch operation falied: ", error);
	  }
  // OPTIONAL: persist refreshToken somewhere
}


async function getValidAccessToken() {
  if (isAccessTokenExpired()) {
    await refreshAccessToken();
  }
  // console.log(accessToken)
  return accessToken;
}


async function postTweet(){
	//define varaibles for random topic for AI:
	let lastTopic = null;
	let lastAudience = null;
	let lastAngle = null;

	const audiences = [
	  "middle-class households",
	  "salaried professionals",
	  "high-net-worth individuals"
	];

	const topics = [
	  "stocks",
	  "equity mutual funds",
	  "SIPs",
	  "fixed deposits",
	  "bonds",
	  "gold",
	  "real estate",
	  "Tier-1 vs Tier-2 cities",
	  "passive income",
	  "retirement planning",
	  "crypto risks",
	  "emergency funds",
	  "insurance",
	  "lifestyle vs wealth trade-offs"
	];

	const angles = [
	  "risk-first thinking",
	  "cash-flow mindset",
	  "long-term compounding",
	  "tax efficiency",
	  "liquidity vs growth",
	  "emotional discipline",
	  "urban lifestyle trade-offs"
	];
	
	const audience = pickRandom(audiences, lastAudience);
	const topic = pickRandom(topics, lastTopic);
	const angle = pickRandom(angles, lastAngle);

	// update memory
	lastAudience = audience;
	lastTopic = topic;
	lastAngle = angle;


	const token = await getValidAccessToken();
	const tweet = await ai(audience, topic, angle);
	const time = new Date().toLocaleTimeString("en-US", {
		  hour: "2-digit",
		  minute: "2-digit",
		  second: "2-digit",
		  hour12: true,
		});
	const tweet_options ={
		method: 'POST',
		headers: {
			'Content-Type': "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
				text: tweet
			})
	}
	let response;
	try{
		response = await fetch(baseURL + tweetURL, tweet_options);
		console.log(`\nThe total remaining tweets in a day are: ${response.headers.get("x-app-limit-24hour-remaining")}`)
		const resetTime = new Date(response.headers.get("x-rate-limit-reset") * 1000);
		console.log(`\nTry after ${resetTime.toLocaleString()} time`);
		if(!response.ok){
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		console.log(data);
		console.log(refreshToken)
		console.log(time)
	} catch(error){
		console.error("Posting tweet falied: ", error);
		if (response){
			try {
				const errorText = await response.text();  // Now accessible here
				console.error('Error response body:', errorText);
			  } catch (textError) {
				console.error('Failed to read error text:', textError);
			  }
			} else {
			  console.error('No response available (e.g., network error)');
			}
	}
}
postTweet();

setInterval(() => {
	postTweet().catch(console.error);
}, 180000);

// setInterval(() => {
  // getValidAccessToken().catch(console.error);
// }, 10000);

// ai("high-net-worth individuals", "equity mutual funds", "cash-flow mindset")


//function to pick random topic for AI
function pickRandom(arr, lastValue) {
  let choice;
  do {
    choice = arr[Math.floor(Math.random() * arr.length)];
  } while (choice === lastValue);

  return choice;
}

//connect to AI API
async function ai(audience, topic, angle){
	const client = new OpenAI({
		apiKey: process.env.GROQ_API_KEY,
		baseURL: "https://api.groq.com/openai/v1",
	});

	const response = await client.responses.create({
		//model: "groq/compound",
		//model: 'meta-llama/llama-guard-4-12b',
		model: "openai/gpt-oss-120b",
		// model: 'llama-3.3-70b-versatile',
		temperature: 2,
		top_p: 0.9,
		instructions: "You are a personal finance advisor writing for an Indian audience on Twitter (X).",
		input: `${file}`,
	});
	console.log(response.output_text);
	return response.output_text;
}