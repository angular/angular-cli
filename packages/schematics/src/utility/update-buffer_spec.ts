import {UpdateBuffer} from './update-buffer';

describe('UpdateBuffer', () => {
  describe('inserts', () => {
    it('works', () => {
      const mb = new UpdateBuffer(new Buffer('Hello World'));

      mb.insertRight(6, new Buffer('Beautiful '));
      expect(mb.toString()).toBe('Hello Beautiful World');

      mb.insertRight(6, new Buffer('Great '));
      expect(mb.toString()).toBe('Hello Beautiful Great World');

      mb.insertRight(0, new Buffer('1 '));
      expect(mb.toString()).toBe('1 Hello Beautiful Great World');

      mb.insertRight(5, new Buffer('2 '));
      expect(mb.toString()).toBe('1 Hello2  Beautiful Great World');

      mb.insertRight(8, new Buffer('3 '));
      expect(mb.toString()).toBe('1 Hello2  Beautiful Great Wo3 rld');

      mb.insertRight(0, new Buffer('4 '));
      expect(mb.toString()).toBe('1 4 Hello2  Beautiful Great Wo3 rld');

      mb.insertRight(8, new Buffer('5 '));
      expect(mb.toString()).toBe('1 4 Hello2  Beautiful Great Wo3 5 rld');

      mb.insertRight(1, new Buffer('a '));
      expect(mb.toString()).toBe('1 4 Ha ello2  Beautiful Great Wo3 5 rld');

      mb.insertRight(2, new Buffer('b '));
      expect(mb.toString()).toBe('1 4 Ha eb llo2  Beautiful Great Wo3 5 rld');

      mb.insertRight(7, new Buffer('c '));
      expect(mb.toString()).toBe('1 4 Ha eb llo2  Beautiful Great Wc o3 5 rld');

      mb.insertRight(11, new Buffer('d '));
      expect(mb.toString()).toBe('1 4 Ha eb llo2  Beautiful Great Wc o3 5 rldd ');
    });

    it('works _left and _right', () => {
      const mb = new UpdateBuffer(new Buffer('Hello World'));

      mb.insertRight(6, new Buffer('Beautiful '));
      expect(mb.toString()).toBe('Hello Beautiful World');

      mb.insertLeft(6, new Buffer('Great '));
      expect(mb.toString()).toBe('Hello Great Beautiful World');

      mb.insertLeft(6, new Buffer('Awesome '));
      expect(mb.toString()).toBe('Hello Great Awesome Beautiful World');
    });
  });

  describe('delete', () => {
    it('works for non-overlapping ranges', () => {
      //                                                111111111122222222223333333333444444
      //                                      0123456789012345678901234567890123456789012345
      const mb = new UpdateBuffer(new Buffer('1 4 Ha eb llo2  Beautiful Great Wc o3 5 rldd '));

      mb.remove(43, 2);
      expect(mb.toString()).toBe('1 4 Ha eb llo2  Beautiful Great Wc o3 5 rld');
      mb.remove(33, 2);
      expect(mb.toString()).toBe('1 4 Ha eb llo2  Beautiful Great Wo3 5 rld');
      mb.remove(8, 2);
      expect(mb.toString()).toBe('1 4 Ha ello2  Beautiful Great Wo3 5 rld');
      mb.remove(5, 2);
      expect(mb.toString()).toBe('1 4 Hello2  Beautiful Great Wo3 5 rld');
      mb.remove(38, 2);
      expect(mb.toString()).toBe('1 4 Hello2  Beautiful Great Wo3 rld');
      mb.remove(2, 2);
      expect(mb.toString()).toBe('1 Hello2  Beautiful Great Wo3 rld');
      mb.remove(36, 2);
      expect(mb.toString()).toBe('1 Hello2  Beautiful Great World');
      mb.remove(13, 2);
      expect(mb.toString()).toBe('1 Hello Beautiful Great World');
      mb.remove(0, 2);
      expect(mb.toString()).toBe('Hello Beautiful Great World');
      mb.remove(26, 6);
      expect(mb.toString()).toBe('Hello Beautiful World');
      mb.remove(16, 10);
      expect(mb.toString()).toBe('Hello World');
    });

    it('handles overlapping ranges', () => {
      //                                      0123456789012
      const mb = new UpdateBuffer(new Buffer('ABCDEFGHIJKLM'));

      // Overlapping.
      mb.remove(2, 5);
      expect(mb.toString()).toBe('ABHIJKLM');
      mb.remove(3, 2);
      expect(mb.toString()).toBe('ABHIJKLM');
      mb.remove(3, 6);
      expect(mb.toString()).toBe('ABJKLM');
      mb.remove(3, 6);
      expect(mb.toString()).toBe('ABJKLM');
      mb.remove(10, 1);
      expect(mb.toString()).toBe('ABJLM');
      mb.remove(1, 11);
      expect(mb.toString()).toBe('AM');
    });
  });

  describe('inserts and deletes', () => {
    it('works for non-overlapping indices', () => {
      //                                                1
      //                                      01234567890
      const mb = new UpdateBuffer(new Buffer('01234567890'));

      mb.insertRight(6, new Buffer('A'));
      expect(mb.toString()).toBe('012345A67890');
      mb.insertRight(2, new Buffer('B'));
      expect(mb.toString()).toBe('01B2345A67890');

      mb.remove(3, 4);
      expect(mb.toString()).toBe('01B27890');
      mb.insertRight(4, new Buffer('C'));
      expect(mb.toString()).toBe('01B27890');

      mb.remove(2, 6);
      expect(mb.toString()).toBe('01B890');
    });

    it('works for _left/_right inserts', () => {
      //                                      0123456789
      const mb = new UpdateBuffer(new Buffer('0123456789'));

      mb.insertLeft(5, new Buffer('A'));
      expect(mb.toString()).toBe('01234A56789');
      mb.insertRight(5, new Buffer('B'));
      expect(mb.toString()).toBe('01234AB56789');
      mb.insertRight(10, new Buffer('C'));
      expect(mb.toString()).toBe('01234AB56789C');
      mb.remove(5, 5);
      expect(mb.toString()).toBe('01234AB');
      mb.remove(0, 5);
      expect(mb.toString()).toBe('');
    });

    it('supports essential', () => {
      const mb = new UpdateBuffer(new Buffer('0123456789'));

      mb.insertLeft(5, new Buffer('A'), true);
      expect(mb.toString()).toBe('01234A56789');
      mb.remove(5, 5);
      expect(mb.toString()).toBe('01234A');
      expect(() => mb.remove(0, 5)).toThrow();
      expect(mb.toString()).toBe('01234A');

      expect(() => mb.insertRight(6, new Buffer('B'), true)).toThrow();
      expect(mb.toString()).toBe('01234A');
    });
  });

  describe('generate', () => {
    it('works', () => {
      //                                      0123456789
      const mb = new UpdateBuffer(new Buffer('0123456789'));

      mb.insertLeft(5, new Buffer('A'));
      expect(mb.toString()).toBe('01234A56789');
      mb.remove(5, 5);
      expect(mb.toString()).toBe('01234A');
      mb.remove(0, 5);
      expect(mb.toString()).toBe('');

      const buffer = mb.generate();
      expect(buffer.toString()).toBe('');
      expect(buffer.length).toBe(0);
    });
  });
});
