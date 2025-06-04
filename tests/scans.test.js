const fs = require('fs');
const blockchainModule = require('../modules/blockchain');

jest.mock('fs');
jest.mock('../modules/blockchain', () => ({
  recordScanOnBlockchain: jest.fn((data, cb) => cb(null, {}))
}));

const scans = require('../modules/scans');

describe('processScan passage mode limits', () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    fs.readFileSync.mockReset();
    fs.writeFileSync.mockReset();
    blockchainModule.recordScanOnBlockchain.mockClear();
  });

  test('responds 409 when uuid exceeds max scans', () => {
    const campaigns = [{
      type: 'test',
      enabled: true,
      qrs: [{
        location: 'loc1',
        location_id: 'loc1',
        enabled: true,
        mode: 'passage',
        max_scans_per_uuid: 2
      }]
    }];

    const logs = [
      { uuid: '123', location_id: 'loc1', scan_type: 'test', timestamp: 1 },
      { uuid: '123', location_id: 'loc1', scan_type: 'test', timestamp: 2 }
    ];

    fs.existsSync.mockImplementation((filePath) => true);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('campaigns')) {
        return JSON.stringify(campaigns);
      }
      if (filePath.includes('scanlogs')) {
        return JSON.stringify(logs);
      }
      return '[]';
    });

    scans.initialize('scanlogs.json', 'campaigns.json');

    const req = {
      query: { uuid: '123', location_id: 'loc1', scan_type: 'test' }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn()
    };

    scans.processScan(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(blockchainModule.recordScanOnBlockchain).not.toHaveBeenCalled();
  });
});
