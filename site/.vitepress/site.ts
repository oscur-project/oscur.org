// Site-wide settings, shared by the config, the Node helpers and the checks.
const award = (id: string) => ({ id, url: `https://www.nsf.gov/awardsearch/show-award/?AWD_ID=${id}` })

export const SITE = {
  title: 'OSCUR',
  description: 'Open-Source Cyberinfrastructure for Urban Computing',
  hostname: 'https://oscur.org',
  github: 'https://github.com/oscur-project',
  repo: 'https://github.com/oscur-project/oscur.org',
  // Open Graph image for pages that have none of their own.
  image: '/media/brand/oscur-social.png',
  newsOnHome: 6,
  // The acknowledgement under the home page hero and in every footer: the three collaborative NSF awards.
  funding: {
    lead: 'The OSCUR project is supported by the',
    sponsors: [
      {
        name: 'National Science Foundation',
        url: 'https://www.nsf.gov',
        logo: { light: '/media/sponsors/nsf.webp' },
        awards: [award('2411221'), award('2411222'), award('2411223')],
      },
    ],
  },
  // The footer's institution logos. They are colored marks, so dark mode shows them on white tiles.
  institutions: [
    { name: 'New York University', url: 'https://www.nyu.edu/', logo: '/media/institutions/nyu.png' },
    { name: 'University of Illinois Chicago', url: 'https://www.uic.edu/', logo: '/media/institutions/uic.png' },
    { name: 'University of Washington', url: 'https://www.washington.edu/', logo: '/media/institutions/uw.png' },
  ],
}
