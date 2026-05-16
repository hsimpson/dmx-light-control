import midi from 'midi';

const output = new midi.Output();
const input = new midi.Input();

// List available output ports
for (let i = 0; i < output.getPortCount(); i++) {
  console.log(`Output ${i}: ${output.getPortName(i)}`);
}

input.openPort(1);

output.openPort(1);

const behavior = 0x9d;
let button = 0x0;
const sendValue = 0x5;

for (let i = 0; i < 60; i++) {
  output.sendMessage([behavior, button, sendValue]);
  console.log(`Sent MIDI message with value: ${sendValue}`);

  // wait for 200ms
  await new Promise(resolve => setTimeout(resolve, 200));
  button++;
}
// List available input ports
for (let i = 0; i < input.getPortCount(); i++) {
  console.log(`Input ${i}: ${input.getPortName(i)}`);
}

input.on('message', (deltaTime, message) => {
  console.log(`m: ${message.join(', ')} d: ${deltaTime}`);
});

output.closePort();
