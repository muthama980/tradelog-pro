-- =============================================================================
-- TradeLog Pro — Supabase Schema
-- Run this once in your Supabase SQL editor.
-- =============================================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  plan            TEXT DEFAULT 'trial' CHECK (plan IN ('trial','core','pro','prop','cancelled')),
  trial_ends_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 days'),
  subscribed_at   TIMESTAMPTZ,
  ls_customer_id  TEXT,                -- Lemon Squeezy customer id
  ls_subscription_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trades
CREATE TABLE IF NOT EXISTS public.trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          TEXT NOT NULL,
  market          TEXT CHECK (market IN ('crypto','forex','stocks','futures','other')) DEFAULT 'crypto',
  direction       TEXT CHECK (direction IN ('long','short')) NOT NULL,
  entry_price     NUMERIC(20,8) NOT NULL,
  exit_price      NUMERIC(20,8),
  position_size   NUMERIC(20,8) NOT NULL,
  fees            NUMERIC(20,8) DEFAULT 0,
  pnl             NUMERIC(20,8),                        -- computed on exit
  r_multiple      NUMERIC(10,4),                        -- risk multiple
  strategy        TEXT,                                 -- e.g. breakout, mean-rev, scalp
  emotion         TEXT,                                 -- e.g. confident, fomo, revenge
  notes           TEXT,
  screenshot_url  TEXT,
  opened_at       TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ,
  status          TEXT CHECK (status IN ('open','closed')) DEFAULT 'open',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trades_user_id_idx     ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS trades_opened_at_idx   ON public.trades(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS trades_strategy_idx    ON public.trades(user_id, strategy);

-- Blog / News posts (CMS-lite)
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  excerpt         TEXT,
  body_md         TEXT NOT NULL,
  cover_image_url TEXT,
  category        TEXT CHECK (category IN ('news','strategy','psychology','product','market-recap')) DEFAULT 'strategy',
  read_minutes    INT DEFAULT 5,
  published       BOOLEAN DEFAULT TRUE,
  published_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_published_at_idx ON public.posts(published, published_at DESC);

-- AI Coach reports (cached weekly outputs)
CREATE TABLE IF NOT EXISTS public.coach_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  summary         TEXT NOT NULL,
  patterns        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

-- ROW LEVEL SECURITY ----------------------------------------------------------
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit only their own row
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trades: full CRUD on own trades only
CREATE POLICY "trades_self_select" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_self_insert" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_self_update" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades_self_delete" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- Coach reports: read own
CREATE POLICY "coach_self_select" ON public.coach_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coach_self_insert" ON public.coach_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Posts: public read for published; insert restricted to service role
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT USING (published = TRUE);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Seed posts (so the blog is alive on day one)
INSERT INTO public.posts (slug, title, excerpt, body_md, category, read_minutes) VALUES
('why-we-built-tradelog-pro',
 'Why We Built TradeLog Pro',
 'A trading journal built by traders who actually trade — because every existing tool missed something important.',
 E'# Why We Built TradeLog Pro\n\nWe were tired of paying for tools designed for American stock traders that did not understand crypto, did not understand forex prop firms, and did not fit the way modern traders actually work.\n\nSo we built one.\n\n## The gap\n\nTradervue. Edgewonk. TraderSync. They are decent products. But every one of them was built more than a decade ago for a world where retail traders mostly bought stocks through a broker and called it a day. The markets have changed. The tools have not.\n\nToday, serious traders operate across crypto spot, perpetual futures, forex pairs, and equity CFDs — often all at once. They work with prop firms. They need emotional tagging, not just P&L ledgers. They need a coach, not a spreadsheet.\n\n## What we want this to be\n\nA disciplined, beautiful, professional ledger. Nothing flashy. No fake AI gimmicks. Just the cleanest record of your trading life — and a coach that actually reads it.\n\nIf that sounds like the tool you want, the trial is four days. No card. Welcome aboard.',
 'product', 4),
('the-three-questions-every-journal-must-answer',
 'The Three Questions Every Trading Journal Must Answer',
 'Forget win rate. Forget P&L. These are the three questions that separate professional traders from gamblers.',
 E'# The Three Questions\n\nMost traders journal the wrong things. They record P&L and forget to record the why. Here are the three questions a journal must answer to actually improve your trading.\n\n## 1. Which strategy actually pays you?\n\nMost traders run three or four setups in parallel and have no idea which one is the breadwinner. A proper journal tells you, by tag, which playbook is profitable and which is bleeding you. You may be surprised. The setup you love is often the one that does not love you back.\n\n## 2. When are you dangerous?\n\nThere is a time of day, a day of the week, or an emotional state in which you lose money. Find it. Avoid it. For most traders, Friday afternoons and the hour after a big loss are where the damage happens. Your data will tell you exactly where yours is.\n\n## 3. What does your edge look like with the bottom 10% removed?\n\nIf removing your worst 10% of trades transforms you from break-even to profitable, your edge is real but your discipline is not. That is fixable. The journal shows you which trades to stop taking — and that is worth more than any signal.',
 'strategy', 6),
('the-emotion-that-cost-us-our-ftmo-challenge',
 'The Emotion That Cost Us an FTMO Challenge',
 'Revenge trading is not a metaphor. It is a measurable, journalable, fixable behavior. Here is what we learned.',
 E'# The Emotion\n\nWe failed our first FTMO challenge in 47 minutes. Not because the strategy was wrong. Because after the first stop-out, we doubled the size to "make it back."\n\nThat single decision — measurable, taggable, foreseeable — was the entire challenge. One emotional override erased weeks of preparation.\n\n## What the data showed\n\nAfter that failure, we started tagging every trade with an emotion before entry. The instruction was simple: before clicking buy or sell, name what you are feeling. Within three weeks, the data was undeniable.\n\nTrades tagged "revenge" had a -2.1R expectancy. Trades tagged "calm" had +0.8R. The math wrote itself. It was not the strategy that needed fixing — it was the state we were in when we entered.\n\n## The fix is not willpower\n\nWillpower is unreliable. What works is a process: a checklist before entry that forces you to name the emotion and decide whether you should still be trading. The journal makes that checklist automatic. Once you can see the pattern, the pattern loses its power.',
 'psychology', 5),
('crypto-bear-market-survival-playbook',
 'Crypto Bear Market Survival Playbook',
 'Volume drops 70%. Strategies that worked in the bull stop working overnight. Here is how to journal through it.',
 E'# Survival\n\nBear markets are not the absence of opportunity — they are the absence of forgiveness. Every mistake costs more. Slippage is worse. Liquidity is thinner. The setups that worked in a trending market fail silently in a ranging one.\n\nHere is how we use the journal to navigate them.\n\n## Cut your size first\n\nThe single most important journal data point in a bear: position size. Most traders keep trading bull-market size in bear-market liquidity. The journal will reveal the damage within ten trades. If your average loss in the bear is 40% larger than in the bull, the problem is not your strategy — it is your sizing.\n\n## Re-validate every strategy\n\nA breakout strategy that won 60% in a bull will win 30% in a bear. The setup looks identical on the chart; the regime changed. Your journal is the only thing that will catch this in time — before the drawdown is already deep.\n\n## Track regime, not just trades\n\nAdd a field to every journal entry: market regime. Bull, bear, ranging. After 30 trades, filter by regime. The strategies that survive will surprise you. The ones that do not will be obvious — and expensive if you keep running them.',
 'strategy', 7);
