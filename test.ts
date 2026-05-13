async function test() {
  const response = await fetch('http://localhost:3000/dynamic/2026/21.05.26 - Met Gala/', {
    headers: {
      Accept: 'application/json',
    },
  });

  const data = await response.json();

  // console.log('Response:', data);

  console.log(data.keys);

  let SUBJECT_LINE_INDEX = data.keys.indexOf('Subject Line');
  let PAGE_TITLE_INDEX = data.keys.indexOf('Page Title');

  console.log('SLI:', SUBJECT_LINE_INDEX, 'PTI:', PAGE_TITLE_INDEX);

  console.log(data.data['UK'][SUBJECT_LINE_INDEX]);
  console.log(data.data['UK'][PAGE_TITLE_INDEX]);
}

test();
