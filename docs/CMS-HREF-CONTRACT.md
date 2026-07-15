# CMS link contract

Navigation items and reusable resource or service links use one deliberately limited link subset. The TypeScript `cmsHrefSchema` and PostgreSQL `is_safe_cms_href` function implement the same rules.

## Shared rules

* Links contain between 1 and 300 ASCII characters.
* Literal whitespace, control characters, backslashes and Unicode characters are rejected. Spaces must be percent encoded when appropriate.
* Internal links begin with one slash, never two. Their path, query and fragment may use ASCII letters, digits and `._~!$&()*+,;=:@%/?#-`. For example, `/`, `/about` and `/?from=cms` are valid.
* External web links use lowercase `http://` or `https://` and an ASCII hostname. Each hostname label begins and ends with a letter or digit and may contain internal hyphens. Unicode hostnames, IPv6 literals and user information are not accepted. The CMS performs no hostname conversion.
* An explicit web port contains one to five digits and has a numeric value from 1 to 65535.
* Email links use lowercase `mailto:`, the local part characters `A-Z`, `a-z`, `0-9`, `.`, `_`, `%`, `+` and `-`, then the same ASCII hostname rules.
* Telephone links use lowercase `tel:`, an optional leading plus, then 7 to 25 characters made from digits, parentheses and hyphens. The first character after the optional plus is a digit.
* Protocol relative links, credentials, `javascript:`, `data:` and every unlisted scheme are rejected.

The broader public content `safeHrefSchema` remains separate. CMS forms always use `cmsHrefSchema`, so every stored CMS link is accepted identically by the application and database boundaries.
