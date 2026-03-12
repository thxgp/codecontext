import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabase, User } from '../config/supabase';
import { authMiddleware } from '../middleware';

const router = Router();

// Redirect to GitHub OAuth
router.get('/github', (_req: Request, res: Response) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${encodeURIComponent(config.github.callbackUrl)}&scope=user:email,repo`;
  res.redirect(githubAuthUrl);
});

// GitHub OAuth callback
router.get('/github/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${config.clientUrl}/auth/error?message=No code provided`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.redirect(`${config.clientUrl}/auth/error?message=Failed to get access token`);
    }

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;

    // Get user email if not public
    let email = githubUser.email;
    if (!email) {
      try {
        const emailsResponse = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const primaryEmail = emailsResponse.data.find((e: { primary: boolean }) => e.primary);
        email = primaryEmail?.email || null;
      } catch {
        // Email fetch failed, continue without it
      }
    }

    // Upsert user in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('github_id', String(githubUser.id))
      .single<User>();

    let user: User;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          username: githubUser.login,
          email,
          avatar: githubUser.avatar_url,
          access_token: accessToken,
        })
        .eq('id', existingUser.id)
        .select()
        .single<User>();

      if (error || !updatedUser) {
        throw new Error('Failed to update user');
      }
      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          github_id: String(githubUser.id),
          username: githubUser.login,
          email,
          avatar: githubUser.avatar_url,
          access_token: accessToken,
        })
        .select()
        .single<User>();

      if (error || !newUser) {
        throw new Error('Failed to create user');
      }
      user = newUser;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    // Redirect to client with token
    res.redirect(`${config.clientUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${config.clientUrl}/auth/error?message=Authentication failed`);
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, github_id, username, email, avatar, created_at')
      .eq('id', req.userId!)
      .single<Partial<User>>();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout (client-side token removal, but we can use this for cleanup)
router.post('/logout', authMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
