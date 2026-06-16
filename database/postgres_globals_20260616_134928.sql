--
-- PostgreSQL database cluster dump
--

\restrict C4wWeoCY2CedzKiGGYdtecqaMBmGylGThro2mWg9QQlS7SpULrQrEWpfcqur9uN

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE mahima_user;
ALTER ROLE mahima_user WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:3y7Jup4kjwBd7vhDWkRVaw==$D7gVDx6fS8TkwyZyHLXeyHy1gBbRSjHKKepSCT6OcQM=:rt98MOn4Vht9IEsPVNMcc+j4nqtHyErKbNN3bXxqSQQ=';
CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:o9XSu6YVKldHsi9ceeTTrw==$AdcHf6aqPNeOlYzGjuje/J2bm8zx4/iLCaZYCndPHtc=:QxNN+qJKrib6ftZGE1l49B8V2fATE1xrkAM4d8QbckM=';

--
-- User Configurations
--

--
-- User Config "mahima_user"
--

ALTER ROLE mahima_user SET client_encoding TO 'utf8';
ALTER ROLE mahima_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE mahima_user SET "TimeZone" TO 'UTC';








\unrestrict C4wWeoCY2CedzKiGGYdtecqaMBmGylGThro2mWg9QQlS7SpULrQrEWpfcqur9uN

--
-- PostgreSQL database cluster dump complete
--

