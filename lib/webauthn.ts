import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'Todo App';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:3000';

export async function getRegistrationOptions(username: string) {
  return generateRegistrationOptions({
    rpID: RP_ID,
    rpName: RP_NAME,
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
  });
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
) {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
  });
}

export async function getAuthenticationOptions() {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60000,
  });
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  publicKey: Buffer,
  signCount: number
) {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialPublicKey: publicKey,
      credentialID: Buffer.from(response.id, 'base64url'),
      counter: signCount,
    },
  } as Parameters<typeof verifyAuthenticationResponse>[0]);
}
