import http from 'http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';
import express from 'express';
import OpenAI from "openai";
import * as fs from 'fs';

let lastTweetId = null;
let count = 0;
const posts = [
  "1/ 🚨 CRASH ALERT: Gold & Silver ETFs are seeing a historic bloodbath! 📉\n\nIn just 72 hours, we've seen record highs turn into a $7 TRILLION wipeout globally. MCX Gold tanked ₹20,000+ and Silver plunged nearly 30% from the peak! 😱\n\nWhat’s actually happening? Let’s dive into the 10 reasons why. 👇🧵\n\n#GoldPrice #SilverCrash",

  "2/ 🦅 THE WARSH EFFECT\n\nThe biggest trigger? Trump’s nomination of Kevin Warsh as the next Fed Chair. 🏦\n\nWarsh is a known \"inflation hawk.\" Markets now bet on higher interest rates for longer & a shrinking Fed balance sheet. Higher rates = Death for non-yielding Gold. 💀\n\n#FederalReserve #KevinWarsh",

  "3/ 💵 THE KING IS BACK\n\nThe US Dollar Index ($DXY) is surging! 🚀\n\nSince Gold is priced in Dollars globally, a stronger greenback makes the yellow metal more expensive for everyone else. Demand cools, prices drop. It’s the classic inverse relationship at play. 📉",

  "4/ 🛑 THE MARGIN SQUEEZE\n\nCME Group just hiked margin requirements for Gold and Silver futures! 💸\n\nTraders now need more cash upfront to hold their positions. This forced \"over-leveraged\" players to dump their holdings instantly, creating a massive domino effect of selling. 🌊",

  "5/ 🇮🇳 THE INDIA BUDGET TWIST\n\nBudget 2026 was a mixed bag! 👜\n\nFM @nsitharaman cut import duty to 5%, which sounds good, but it actually lowered the domestic base price immediately. Combine that with global weakness, and the local crash was amplified! 🇮🇳💥\n\n#Budget2026 #NirmalaSitharaman",

  "6/ 📜 THE SGB TAX BLOW\n\nBig change for Sovereign Gold Bonds! 📉\n\nCapital gains tax exemption at maturity is now ONLY for original subscribers. If you bought SGBs from the secondary market (Stock Exchange), you're now liable for 12.5% LTCG. The \"tax-free\" hype for traders is OVER. 🚫",

  "7/ 📉 AGGRESSIVE PROFIT BOOKING\n\nLet's be real: Gold was up 30% and Silver up 70% in Jan alone! 🔥\n\nIt was \"overbought\" on every technical chart (RSI was 90+!). Institutional investors were looking for any excuse to click 'Sell' and lock in those massive gains. 💰✅",

  "8/ ⚡ WHY SILVER GOT RECKED HARDER\n\nSilver isn't just jewelry; it's industrial (EVs, Solar, AI). 🔌\n\nWith a hawkish Fed, markets fear an economic slowdown. If factories slow down, silver demand drops. Being a smaller, less liquid market, it fell 3x faster than Gold! 🎢",

  "9/ 🕊️ GEOPOLITICAL COOLING?\n\nPart of the record rally was a \"fear premium\" over Iran-US tensions. 🇮🇷🇺🇸\n\nRecent signals of potential dialogue have eased some immediate war fears. When the world feels 1% safer, the 'safe-haven' bid for gold starts to evaporate. 🌍✨",

  "10/ 🐂 IS THE BULL RUN DEAD?\n\nProbably not! 📉➡️🚀\n\nAnalysts call this a \"healthy reset.\" Central banks are still buying, and industrial silver demand is still in deficit. \n\nStrategy: Don't catch a falling knife, but watch the support levels! 🛡️\n\nAre you Buying the Dip or Waiting? 👇"
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
		console.log("Thread completed ✅");
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
	  // 🔗 If this is not the first tweet, reply to the previous one
	if (lastTweetId) {
		body.reply = {
		  in_reply_to_tweet_id: lastTweetId
		};
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
		lastTweetId = data.data.id;
		console.log(`Tweet ${count}/${posts.length} posted`);
		console.log(`Tweet ID: ${lastTweetId}`);

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
    await new Promise(resolve => setTimeout(resolve, 300000)); // 5 min gap
  }
}

postThread();