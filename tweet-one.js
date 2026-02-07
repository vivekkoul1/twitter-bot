import http from 'http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';
import express from 'express';
import OpenAI from "openai";
import * as fs from 'fs';

let lastTweetId = null;
let count = 0;
const posts = [
  "🚨 STOP chasing 10-baggers if your foundation is shaky! Your first step to wealth isn't a stock; it's an Emergency Fund. 🛡️\n\nKeep 3-6 months of expenses in a liquid account. Why? So you never have to sell your portfolio at a loss when life hits the fan. Peace of mind is the ultimate asset. 🧵👇\n\n#PersonalFinance #MoneyTips #Nifty",

  "📊 Master the 50/30/20 Rule:\n\n✅ 50% for Needs (Rent, food, bills)\n✅ 30% for Wants (Fun, travel, dining)\n✅ 20% for your Future (SIPs, debt)\n\nSimple math: If your Needs > 50%, you aren't living; you're just surviving a lifestyle you can't afford. Trim the fat to grow the future! ✂️📈\n\n#FinancialFreedom #Budgeting #Nifty",

  "🧨 Kill the 'Wealth Destroyers'. High-interest debt (like Credit Cards at 36%+) is a trap. \n\nMath check: Paying off a 36% interest card is exactly like getting a GUARANTEED 36% return on your money. No mutual fund or stock can promise you that. Kill the debt before you build the portfolio! 💳🚫\n\n#DebtFree #Savings #Nifty",

  "🤖 Automate your wealth. Human willpower is a myth when it comes to money. \n\nSet your SIP to trigger the day AFTER your salary hits. Treat your future self like a mandatory bill. If you wait to save 'whatever is left' at the end of the month, you’ll save zero. Automation is the secret sauce. 📉📈\n\n#Investing #SIP #Nifty",

  "💊 Keep it pure. Never mix insurance with investment (Looking at you, ULIPs & traditional plans). \n\nBuy a Pure Term Plan for life and a strong Health Insurance policy. Take the money you save and put it into low-cost Index Funds. Higher cover + better returns = The ultimate win. 🏆\n\n#Insurance #MoneyHacks #Nifty"
];



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
	file = fs.readFileSync("./prompt.txt").toString();
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
	console.log(count);
	
	if (count >= posts.length) {
		return;
  }
	let tweet = posts[count];
	count++;
	const token = await getValidAccessToken();
	const time = new Date().toLocaleTimeString("en-US", {
		  hour: "2-digit",
		  minute: "2-digit",
		  second: "2-digit",
		  hour12: true,
		});
		
	const body = {
				text: tweet,
				//community_id: '1471840562399485958',
			}	
			
	const tweet_options ={
		method: 'POST',
		headers: {
			'Content-Type': "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
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
		
		// ✅ Save this tweet's ID for the next reply
		console.log(`Tweet ${count}/${posts.length} posted`);

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


async function postThread() {
  for (let i = 0; i < posts.length; i++) {
    await postTweet();
    await new Promise(resolve => setTimeout(resolve, 182670)); // 3 min gap
  }
}

postThread();